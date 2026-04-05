// import puppeteer from 'puppeteer';
// import * as fs from 'fs';
// import * as path from 'path';

// function findChromePath(): string | undefined {
//   const basePath = '/opt/render/.cache/puppeteer/chrome';

//   if (!fs || !fs.existsSync(basePath)) return undefined;

//   const versions = fs.readdirSync(basePath);

//   if (!versions.length) return undefined;

//   const latest = versions.sort().reverse()[0];

//   const chromePath = path.join(basePath, latest, 'chrome-linux64', 'chrome');

//   return chromePath;
// }

// export class PdfService {
//   async generateMeetingReportPdf(html: string): Promise<Buffer> {
//     const executablePath = findChromePath();

//     const browser = await puppeteer.launch({
//       headless: true,
//       executablePath: executablePath || undefined,

//       args: [
//         '--no-sandbox',
//         '--disable-setuid-sandbox',
//         '--disable-dev-shm-usage',
//         '--disable-gpu',
//       ],
//     });

//     const page = await browser.newPage();

//     await page.setContent(html, {
//       waitUntil: 'networkidle0',
//     });

//     const pdf = await page.pdf({
//       format: 'A4',
//       printBackground: true,
//       margin: {
//         top: '20px',
//         bottom: '20px',
//         left: '20px',
//         right: '20px',
//       },
//     });

//     await browser.close();

//     return Buffer.from(pdf);
//   }
// }

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
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
    });

    await browser.close();
    return Buffer.from(pdf);
  }
}
