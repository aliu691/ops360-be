export function adminInviteTemplate(params: {
  inviterEmail: string;
  inviteLink: string;
}) {
  const { inviterEmail, inviteLink } = params;

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Ops360 Admin Invitation</title>
  </head>
  <body style="
    margin: 0;
    padding: 0;
    background-color: #f5f7fb;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #1f2937;
  ">
  
    <div style="
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    ">
  
      <!-- Header -->
      <div style="
        background: linear-gradient(135deg, #0f172a, #020617);
        padding: 24px;
        text-align: center;
        color: #ffffff;
        font-size: 22px;
        font-weight: 600;
      ">
        Ops360
      </div>
  
      <!-- Body -->
      <div style="padding: 40px 32px; text-align: center;">
  
        <div style="
          width: 64px;
          height: 64px;
          margin: 0 auto 20px;
          background: #eef2ff;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
        ">
          🛡️
        </div>
  
        <h1 style="
          font-size: 22px;
          margin-bottom: 8px;
          font-weight: 600;
        ">
          You've been invited to join Ops360
        </h1>
  
        <p style="
          font-size: 15px;
          color: #475569;
          margin-bottom: 24px;
        ">
          as an Administrator
        </p>
  
        <p style="
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 24px;
        ">
          Hello, you have been invited to join the <strong>Ops360</strong> workspace as a system administrator.
          This role grants you full access to manage users, configure system settings, and oversee platform performance metrics.
        </p>
  
        <p style="
          font-size: 15px;
          line-height: 1.6;
          color: #475569;
          margin-bottom: 32px;
        ">
          Ops360 is your central hub for operational excellence, providing real-time KPI tracking and meeting intelligence
          to drive your team’s success.
        </p>
  
        <!-- CTA -->
        <a href="${inviteLink}" target="_blank" style="
          display: inline-block;
          background: #4f7df3;
          color: #ffffff;
          text-decoration: none;
          padding: 14px 28px;
          border-radius: 8px;
          font-size: 15px;
          font-weight: 600;
        ">
          Accept Invitation
        </a>
      </div>
  
      <!-- Footer -->
      <div style="
        border-top: 1px solid #e5e7eb;
        padding: 24px 32px;
        font-size: 13px;
        color: #6b7280;
        line-height: 1.6;
      ">
        <p style="margin: 0 0 8px;">
          <strong>Invited by:</strong> Ops360 Team
        </p>
  
        <p style="margin: 0;">
          This invitation will expire in 24 hours.
          If you did not expect this invitation, you can safely ignore this email.
        </p>
      </div>
  
      <div style="
        text-align: center;
        padding: 16px;
        font-size: 12px;
        color: #9ca3af;
      ">
        © ${new Date().getFullYear()} Ops360 Inc. All rights reserved.
      </div>
  
    </div>
  
  </body>
  </html>
  `;
}
