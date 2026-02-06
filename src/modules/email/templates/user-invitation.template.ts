// email/templates/user-invitation.template.ts
export function userInvitationTemplate(params: {
  inviterName?: string;
  inviteLink: string;
}) {
  const { inviterName = 'Ops360 Team', inviteLink } = params;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Ops360 Invitation</title>
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
            👋
          </div>
    
          <h1 style="
            font-size: 22px;
            margin-bottom: 12px;
            font-weight: 600;
          ">
            You’ve been added to Ops360
          </h1>
    
          <p style="
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 24px;
          ">
            You’ve been added as a <strong>team user</strong> on the Ops360 platform.
            Ops360 helps sales teams track opportunities, manage pipelines,
            and capture meeting insights in one place.
          </p>
    
          <p style="
            font-size: 15px;
            line-height: 1.6;
            color: #475569;
            margin-bottom: 32px;
          ">
            To access your account, please set up your password using the button below.
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
            Set Up Password
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
            <strong>Added by:</strong> ${inviterName}
          </p>
    
          <p style="margin: 0;">
            This setup link will expire in 24 hours.
            If you weren’t expecting this email, you can safely ignore it.
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
