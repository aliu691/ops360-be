export function commentNotificationTemplate(params: {
  senderName: string;
  senderEmail: string;
  dealName: string;
  organizationName: string;
  content: string;
  isEdit?: boolean;
}) {
  const {
    senderName,
    senderEmail,
    dealName,
    organizationName,
    content,
    isEdit,
  } = params;

  return `
  <!DOCTYPE html>
  <html>
  <body style="
    margin:0;
    background:#f5f7fb;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto;
  ">

  <div style="
    max-width:600px;
    margin:40px auto;
    background:#fff;
    border-radius:12px;
    overflow:hidden;
    box-shadow:0 10px 25px rgba(0,0,0,0.08);
  ">

    <!-- HEADER -->
    <div style="
      background:linear-gradient(135deg,#0f172a,#020617);
      padding:20px;
      color:#fff;
      text-align:center;
      font-weight:600;
    ">
      Ops360
    </div>

    <!-- BODY -->
    <div style="padding:32px;">

      <h2 style="margin:0 0 10px;">
        ${isEdit ? 'Comment Updated' : 'New Comment'} — ${organizationName}
      </h2>

      <p style="color:#64748b; margin-bottom:24px;">
        <strong>${senderName}</strong> ${isEdit ? 'updated' : 'added'} a comment
      </p>

      <!-- CONTEXT STACK -->
<div style="margin-bottom:24px;">

  <div style="margin-bottom:12px;">
    <p style="font-size:12px;color:#94a3b8;margin:0;">
      ORGANIZATION NAME
    </p>
    <p style="font-weight:600;margin:4px 0;">
      ${organizationName}
    </p>
  </div>

  <div>
    <p style="font-size:12px;color:#94a3b8;margin:0;">
      DEAL NAME
    </p>
    <p style="font-weight:600;margin:4px 0;">
      ${dealName}
    </p>
  </div>

</div>

      <!-- COMMENT BOX -->
      <div>
        <p style="
          font-size:12px;
          color:#94a3b8;
          margin-bottom:6px;
        ">
          COMMENT CONTENT
        </p>

        <div style="
          background:#f1f5f9;
          border-left:4px solid #3b82f6;
          padding:14px;
          border-radius:8px;
          font-style:italic;
          color:#1e293b;
        ">
          "${content}"
        </div>
      </div>

    </div>

    <!-- FOOTER -->
    <div style="
      border-top:1px solid #e5e7eb;
      padding:20px;
      font-size:13px;
      color:#6b7280;
    ">
      Replies go directly to <strong>${senderEmail}</strong>
    </div>

  </div>

  </body>
  </html>
  `;
}
