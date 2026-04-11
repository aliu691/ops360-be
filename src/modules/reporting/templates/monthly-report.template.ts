export function buildMonthlyReportHTML(
  report: any,
  repName: string,
  month: string,
) {
  const formatMonth = (m: string) => {
    const [year, mm] = m.split('-');
    const date = new Date(Number(year), Number(mm) - 1);
    return `${date.toLocaleString('en-US', { month: 'long' })} ${year}`;
  };

  const formattedMonth = formatMonth(month);

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });

  const grouped = report.meetings.reduce((acc, m) => {
    if (!acc[m.weekLabel]) acc[m.weekLabel] = [];
    acc[m.weekLabel].push(m);
    return acc;
  }, {});

  return `
  <html>
  <head>
    <style>
      body {
        font-family: Inter, Arial, sans-serif;
        padding: 40px;
        background: #f9fafb;
        color: #111827;
      }

      .container {
        max-width: 900px;
        margin: 0 auto;
      }

      .muted { color: #6b7280; }

      .title {
        font-size: 42px;
        font-weight: 800;
        margin: 10px 0;
      }

      .section {
        margin-top: 30px;
      }

      .row {
        display: flex;
        gap: 20px;
      }

      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 20px;
        flex: 1;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      }

      .big-card {
        background: #eef2f7;
      }

      .kpi-number {
        font-size: 36px;
        font-weight: 800;
      }

      .progress {
        height: 6px;
        background: #e5e7eb;
        border-radius: 10px;
        margin-top: 10px;
      }

      .progress-bar {
        height: 6px;
        border-radius: 10px;
      }

      .badge {
        display: inline-block;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
      }

      .badge-red { background: #fee2e2; color: #b91c1c; }
      .badge-green { background: #dcfce7; color: #166534; }

      .mini-card {
        background: #ffffff;
        border-radius: 10px;
        padding: 12px;
        font-size: 12px;
        box-shadow: 0 1px 6px rgba(0,0,0,0.04);
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }

      .meeting {
        border-bottom: 1px solid #e5e7eb;
        padding: 10px 0;
      }

      .pill {
        display: inline-block;
        background: #ecfdf5;
        color: #065f46;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 11px;
        margin-right: 4px;
      }
        
    .page-break {
    page-break-before: always;
    }

    /* =========================
    DONUT CHART
    ========================= */
    .donut {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: conic-gradient(#2563eb var(--value), #e5e7eb 0);
    display: flex;
    align-items: center;
    justify-content: center;
    }

    .donut-inner {
    width: 55px;
    height: 55px;
    border-radius: 50%;
    background: white;
    }

    /* =========================
    ICON CIRCLE
    ========================= */
    .icon-circle {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    border: 6px solid #2563eb;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #2563eb;
    font-size: 24px;
    font-weight: bold;
    }

    /* =========================
    KPI REFINEMENT
    ========================= */
    .kpi-sub {
    font-size: 12px;
    color: #6b7280;
    margin-top: 6px;
    }

    .section-card {
    background: #ffffff;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
    }
    </style>
  </head>

  <body>
  <div class="container">

    <!-- =========================
        HEADER
    ========================== -->
<div style="
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  margin-bottom:20px;
">

  <!-- LEFT -->
  <div>
    <p style="
      color:#2563eb;
      font-size:11px;
      font-weight:600;
      letter-spacing:0.5px;
      margin-bottom:8px;
    ">
      PERFORMANCE PERIOD: ${formattedMonth.toUpperCase()}
    </p>

    <h1 style="
      font-size:42px;
      font-weight:800;
      margin:0;
      line-height:1.1;
    ">
      Analytics Summary
    </h1>

    <p style="
      font-size:14px;
      font-weight:600;
      margin-top:8px;
      color:#111827;
    ">
      ${repName}
    </p>

    <p style="
      font-size:14px;
      color:#6b7280;
      margin-top:10px;
      max-width:520px;
    ">
      Detailed breakdown of organizational meeting performance and pre-sales engagement for the ${report.targets.weeks}-week period.
    </p>
  </div>

  <!-- RIGHT (NOW INLINE WITH HEADER) -->
  <div style="text-align:right; margin-top:2px;">
    <p style="
      font-size:10px;
      color:#9ca3af;
      margin:0;
      letter-spacing:0.5px;
    ">
      REPORT GENERATED
    </p>

    <p style="
      font-size:14px;
      font-weight:600;
      margin:2px 0 0 0;
    ">
      ${today}
    </p>
  </div>
</div>


    <!-- =========================
        KPI SECTION (FIXED)
    ========================== -->
    <div class="row section">

    <!-- TOTAL MEETINGS -->
    <div class="card big-card">
        <p class="muted">TOTAL MEETINGS</p>

        <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
            <div class="kpi-number">
            ${report.totals.meetings}
            <span class="muted" style="font-size:16px;">
                / ${report.targets.meetings} Target
            </span>
            </div>
        </div>

        ${
          report.deltas.meetingDelta !== 0
            ? `<span class="badge ${
                report.deltas.meetingDelta > 0 ? 'badge-green' : 'badge-red'
              }">
                ${Math.abs(report.deltas.meetingDelta)} ${
                  report.deltas.meetingDelta > 0
                    ? 'Over Target'
                    : 'Below Target'
                }
            </span>`
            : ''
        }
        </div>

        <p class="muted" style="margin-top:10px;">MEETING ACHIEVEMENT</p>

        <div class="progress">
        <div class="progress-bar" style="
            width:${report.performance.meetingAchievementRate}%;
            background:#2563eb;
        "></div>
        </div>

        <p class="muted">${report.performance.meetingAchievementRate}%</p>
    </div>

    <!-- PRE-SALES -->
    <div class="card">
        <p class="muted">PRE-SALES ENGAGEMENT</p>

        <div style="display:flex; justify-content:space-between; align-items:center;">
        <div>
            <div class="kpi-number">
            ${report.totals.meetingsWithPresales}
            <span class="muted" style="font-size:16px;">
                / ${report.targets.presales}
            </span>
            </div>
        </div>

        ${
          report.deltas.presalesDelta !== 0
            ? `<span class="badge ${
                report.deltas.presalesDelta > 0 ? 'badge-green' : 'badge-red'
              }">
                ${Math.abs(report.deltas.presalesDelta)} ${
                  report.deltas.presalesDelta > 0
                    ? 'Over Target'
                    : 'Below Target'
                }
            </span>`
            : ''
        }
        </div>

        <p class="muted" style="margin-top:10px;">PRE-SALES SUCCESS</p>

        <div class="progress">
        <div class="progress-bar" style="
            width:${report.performance.presalesAchievementRate}%;
            background:#059669;
        "></div>
        </div>

        <p class="muted">${report.performance.presalesAchievementRate}%</p>
    </div>

    </div>


    <!-- =========================
        CLIENT BREAKDOWN
    ========================== -->
    <div class="section">
      <p style="font-weight:600;">Client Portfolio Breakdown</p>

      <div class="grid">
        ${report.analytics.clientBreakdown
          .map(
            (c) => `
          <div class="mini-card">
            <strong>${c.client}</strong><br/>
            ${c.meetings} meetings
          </div>
        `,
          )
          .join('')}
      </div>
    </div>


    <!-- =========================
        MEETING REGISTRY
    ========================== -->
    
    <div class="section page-break">
    <p style="font-weight:600; margin-bottom:10px;">Meeting Records</p>

    <table style="
        width:100%;
        border-collapse:collapse;
        font-size:12px;
        background:white;
        border-radius:12px;
        overflow:hidden;
    ">

        <!-- HEADER -->
        <thead style="background:#f9fafb; color:#6b7280; font-size:11px;">
        <tr>
            <th style="padding:12px 16px; text-align:left;">CLIENT</th>
            <th style="padding:12px 16px; text-align:left;">OUTCOME</th>
            <th style="padding:12px 16px; text-align:left;">PRE-SALES</th>
        </tr>
        </thead>

        <tbody>

        ${Object.entries(grouped)
          .map(
            ([week, meetings]: any) => `
            
            <!-- WEEK HEADER -->
            <tr style="background:#f3f0ff;">
            <td colspan="2" style="
                padding:10px 16px;
                font-size:11px;
                font-weight:600;
                color:#6d28d9;
            ">
                ${week}
            </td>

            <td style="
                padding:10px 16px;
                text-align:right;
            ">
                <span style="
                background:#ede9fe;
                color:#6d28d9;
                font-size:10px;
                padding:4px 10px;
                border-radius:999px;
                font-weight:600;
                ">
                ${meetings.length} meeting${meetings.length > 1 ? 's' : ''}
                </span>
            </td>
            </tr>

            <!-- MEETINGS -->
            ${meetings
              .map(
                (m) => `
            <tr style="border-top:1px solid #f1f5f9;">
                
                <!-- CLIENT -->
                <td style="
                padding:16px;
                font-weight:600;
                vertical-align:top;
                ">
                ${m.customerName}
                </td>

                <!-- OUTCOME -->
                <td style="
                padding:16px;
                vertical-align:top;
                color:#374151;
                max-width:260px;
                line-height:1.4;
                ">
                ${m.meetingOutcome || '—'}
                </td>

                <!-- PRE-SALES -->
                <td style="
                padding:16px;
                vertical-align:top;
                ">
                ${
                  m.preSalesOwners?.length
                    ? `<div style="display:flex; flex-wrap:wrap; gap:6px;">${m.preSalesOwners
                        .map(
                          (p) => `
                        <span style="
                            background:#f3f4f6;
                            color:#374151;
                            padding:4px 10px;
                            border-radius:999px;
                            font-size:10px;
                            font-weight:500;
                        ">
                            ${p.firstName} ${p.lastName}
                        </span>
                        `,
                        )
                        .join('')}</div>`
                    : '—'
                }
                </td>

            </tr>
            `,
              )
              .join('')}
        `,
          )
          .join('')}

        </tbody>
    </table>
    </div>

  </div>
  </body>
  </html>
  `;
}
