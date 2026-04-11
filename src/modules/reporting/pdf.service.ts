import puppeteer, { executablePath } from 'puppeteer';

export class PdfService {
  async generateMeetingReportPdf(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();

    // Increase the default navigation timeout
    page.setDefaultNavigationTimeout(60000);

    await page.setContent(html, {
      waitUntil: 'domcontentloaded', // ✅ Don't wait for network to go idle
    });

    // Give external resources a moment to load after DOM is ready
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });

    await browser.close();
    return Buffer.from(pdf);
  }
}
