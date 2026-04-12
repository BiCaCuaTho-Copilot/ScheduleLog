import emailjs from "@emailjs/browser";
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, TEACHER_NAME } from "./emailConfig";
import { formatVND, formatDate } from "./helpers";

export function buildReceiptHTML(params: {
  studentName: string;
  amount: number;
  date: string;
  note: string;
  sessions?: { date: string; hours: number; fee: number }[];
}): string {
  const { studentName, amount, date, note, sessions = [] } = params;

  // Tạo mã đơn hàng từ ngày
  const orderId = "#HF-" + date.replace(/-/g, "");

  // Tính tổng từ sessions nếu có, fallback về amount
  const sessionTotal = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.fee, 0)
    : 0;

  // Render rows
  const itemRows = sessions.length > 0
    ? sessions.map((s) => `
              <tr>
                <td style="padding:14px 0; border-bottom:1px solid #E8DFC8;">
                  <p style="font-family:Arial,sans-serif; font-size:14px; color:#2C2415; font-weight:bold; margin:0;">Buổi học ${formatDate(s.date)}</p>
                  <p style="font-family:Arial,sans-serif; font-size:12px; color:#7A6E5A; margin:3px 0 0;">${s.hours} giờ × ${formatVND(s.fee / s.hours)}/giờ</p>
                </td>
                <td align="right" valign="top" style="padding:14px 0 14px 12px; border-bottom:1px solid #E8DFC8; font-family:Arial,sans-serif; font-size:14px; color:#7A6E5A; white-space:nowrap;">×${s.hours}h</td>
                <td align="right" valign="top" style="padding:14px 0 14px 12px; border-bottom:1px solid #E8DFC8; font-family:Arial,sans-serif; font-size:14px; color:#2C2415; white-space:nowrap;">${formatVND(s.fee)}</td>
              </tr>`).join("")
    : `
              <tr>
                <td style="padding:14px 0; border-bottom:1px solid #E8DFC8;">
                  <p style="font-family:Arial,sans-serif; font-size:14px; color:#2C2415; font-weight:bold; margin:0;">Học phí tháng ${date.slice(0, 7).replace("-", "/")}</p>
                  <p style="font-family:Arial,sans-serif; font-size:12px; color:#7A6E5A; margin:3px 0 0;">Giảng viên: Tuấn</p>
                </td>
                <td align="right" valign="top" style="padding:14px 0 14px 12px; border-bottom:1px solid #E8DFC8; font-family:Arial,sans-serif; font-size:14px; color:#7A6E5A; white-space:nowrap;">×1</td>
                <td align="right" valign="top" style="padding:14px 0 14px 12px; border-bottom:1px solid #E8DFC8; font-family:Arial,sans-serif; font-size:14px; color:#2C2415; white-space:nowrap;">${formatVND(amount)}</td>
              </tr>`;

  // Dòng subtotal chỉ hiện khi có sessions và tổng sessions ≠ amount (có discount)
  const subtotalRow = sessions.length > 0 && sessionTotal !== amount ? `
              <tr>
                <td colspan="2" style="padding:12px 0 4px; font-family:Arial,sans-serif; font-size:14px; color:#7A6E5A;">Tạm tính</td>
                <td align="right" style="padding:12px 0 4px; font-family:Arial,sans-serif; font-size:14px; color:#7A6E5A;">${formatVND(sessionTotal)}</td>
              </tr>` : "";

  const noteRow = note ? `
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:28px;">
              <tr>
                <td style="border-left:3px solid #C9A84C; background-color:#FFF9EC; padding:14px 18px; border-radius:0 8px 8px 0;">
                  <p style="font-family:Arial,sans-serif; font-size:13px; color:#7A6E5A; line-height:1.7; margin:0;">
                    📝 &nbsp;<strong style="color:#2C2415;">Ghi chú:</strong> ${note}
                  </p>
                </td>
              </tr>
            </table>` : "";

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="vi">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Biên lai học phí</title>
</head>
<body style="margin:0; padding:0; background-color:#EDE7D9; font-family: Georgia, 'Times New Roman', serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDE7D9;">
  <tr>
    <td align="center" style="padding: 40px 16px;">

      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%;">

        <!-- HERO BANNER -->
        <tr>
          <td style="background-color:#1A1208; border-radius:20px 20px 0 0; padding:0; text-align:center; overflow:hidden; position:relative; max-height:400px;">
            <img src="https://lh3.googleusercontent.com/rd-d/ALs6j_FemRD581wkN9jnwdnDtg66v07_249tFTF5ISGv60BkAuAbI0w-j1TnrNqvIm_hIxBJ8Qdn7sjdDsw_rmeVByuYK8xAP62Ie1udIUG-dlKGxa7OePxjhj2JWaUWce4eb4lH139Xs4q9hYo8D_mjL9h2h-_3QtrnMb6b6F9JqpJDCiZAucMRdfOwID4UTzyk-uXadHea8jqJORE4hA3FNyfT50DDwbNS671zo1s4PdraU4nTUjI00T7fpRq_X74iZaO09HfSvSP7eaIPIjx7H-XHd4vX3sM63KfAXDmxxAs7fKVkrT5IuFK9Zj5wUfLNY0kWzKH2s_e2S4f0NtJ1iib-Ml2YGJT9iySLOoIs0Ydnwqz7FhPx5EdCA_IWfP8Qb2ThpWQ2SA8y1ga5XOgE6TI57uqKTBn7wDw9kzYEZ7M89-YNRe2dtk2WreIw_3ynSvNnCgPKfmIOPDMphlrvdNAaQ7dDs-AF4MAfbNAzqgZ0VOe1aSPS0eZ9tDMVd1G4hT1o_FjS6rFALPFH9XacNPHYnO7PpGgc1jo1zslOeKcNVCivER8Z43nvhxKvOg15p5HR_kMlElbAKwNwOGgDyzMV4QtFl6I3eBEv8OYYC0U50EZkg8DxmTlIsF6kry2FUldNVqSg0z3-Tu240DSVvgswcZe6gkEh3oi7eGZF_KE56_HujuHjFNO_tw0dgDAn5C0W0TIuq1M3K9RPEquNSXA-ciuZDmtR8Orhx5QwOI_MX6YI6e_W_5afhh5u8-GJh-8DQG9bxWafoKsy5gbsWCHgWEpbMH_8CWITZGxGGKGi-i1nOcZcHoowFhiddyu1w_5zyb5ldcgYZLJQIllLs-0iKfaV1gAu-5hs-xS32UST00PQ87vuWRXkR5-oASqYDWifEKsFlTq84HgOcYYcerTFLq0wtDjGYUA_mAXMshn2s5tgAPtqZEse_eGi7mJPPMuDbSd2KUg7JGKJl315Akl4aVnpwIYKRG-sRar9QAM-fk-EWmv5X9T9jZmE9zJwBl1jjU5NGlZ_wIY9o5Rhyqjfn1o5ZDpmlPHtwrK_FBsB9OgU3upSX-6kbWkIi0bmVt1XvXkWc4wOjy2NUXTqUISl1CFBOt2-UXQl0bETu0Sl7srdaCfLDWP5dX-TemyUJoZdBxqxD3qgwThnFvB4Xb2T-sntFAN36YG_Z6QGMFUExIMoHFfqQRMdzQ=w1920-h911?auditContext=forDisplay" alt="" width="600"
              style="display:block; height:400px; object-fit:cover; opacity:0.35; margin:0; padding:0;" />
            <div style="margin-top:-400px; padding:0 40px 48px; position:relative;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="height:1px; background: linear-gradient(to right, transparent, #C9A84C); width:80px;"></td>
                  <td width="20" align="center">
                    <div style="width:8px; height:8px; background-color:#C9A84C; transform:rotate(45deg); display:inline-block; margin: 0 8px;"></div>
                  </td>
                  <td style="height:1px; background: linear-gradient(to left, transparent, #C9A84C); width:80px;"></td>
                </tr>
              </table>
              <div style="width:72px; height:72px; background-color:#C9A84C; border-radius:50%; margin:0 auto 24px; text-align:center; line-height:72px; font-size:32px; color:#1A1208;">✦</div>
              <p style="font-family: Georgia, serif; color:#ffffff; font-size:34px; font-weight:bold; margin:0 0 14px; line-height:1.25;">
                Cảm ơn bạn đã
                <span style="color:#F0D080; font-style:italic;">tin tưởng</span>
                sử dụng dịch vụ của mình!
              </p>
              <p style="color:rgba(255,255,255,0.6); font-family: Arial, sans-serif; font-size:15px; font-weight:300; line-height:1.7; margin:0 auto; max-width:400px;">
                Học phí của bạn đã được ghi nhận và thanh toán thành công. Mình trân trọng sự lựa chọn của bạn và sẽ phục vụ bạn tốt nhất.
              </p>
            </div>
          </td>
        </tr>

        <!-- RECEIPT -->
        <tr>
          <td style="background-color:#FAF6EE; border-left:1px solid #E8DFC8; border-right:1px solid #E8DFC8; padding:40px;">

            <!-- Receipt Header -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px; padding-bottom:20px; border-bottom:1px dashed #E8DFC8;">
              <tr>
                <td>
                  <p style="font-family: Georgia, serif; font-size:20px; color:#2C2415; font-weight:bold; margin:0;">TUAN PT STUDIO</p>
                  <p style="font-family: Arial, sans-serif; font-size:12px; color:#7A6E5A; margin:3px 0 0;">Hoá đơn điện tử</p>
                </td>
                <td align="right" valign="top">
                  <span style="background-color:#E8F5E9; color:#2E7D32; font-family:Arial,sans-serif; font-size:12px; font-weight:bold; padding:5px 14px; border-radius:20px; display:inline-block;">
                    ● Đã thanh toán
                  </span>
                </td>
              </tr>
            </table>

            <!-- Meta Info -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td width="50%" style="padding-bottom:12px;">
                  <p style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; margin:0 0 3px;">Mã đơn hàng</p>
                  <p style="font-family:Arial,sans-serif; font-size:14px; color:#2C2415; font-weight:bold; margin:0;">${orderId}</p>
                </td>
                <td width="50%" style="padding-bottom:12px;">
                  <p style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; margin:0 0 3px;">Ngày thanh toán</p>
                  <p style="font-family:Arial,sans-serif; font-size:14px; color:#2C2415; font-weight:bold; margin:0;">${formatDate(date)}</p>
                </td>
              </tr>
              <tr>
                <td width="50%">
                  <p style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; margin:0 0 3px;">Học viên</p>
                  <p style="font-family:Arial,sans-serif; font-size:14px; color:#2C2415; font-weight:bold; margin:0;">${studentName}</p>
                </td>
                <td width="50%">
                  <p style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; margin:0 0 3px;">Giảng viên</p>
                  <p style="font-family:Arial,sans-serif; font-size:14px; color:#2C2415; font-weight:bold; margin:0;">Tuấn</p>
                </td>
              </tr>
            </table>

            <!-- Items Table -->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr style="border-bottom:1px solid #E8DFC8;">
                <td style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; padding-bottom:10px;">Dịch vụ</td>
                <td align="right" style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; padding-bottom:10px; white-space:nowrap;">SL</td>
                <td align="right" style="font-family:Arial,sans-serif; font-size:10px; color:#7A6E5A; text-transform:uppercase; letter-spacing:1px; padding-bottom:10px; white-space:nowrap;">Thành tiền</td>
              </tr>
              ${itemRows}
              ${subtotalRow}
              <tr>
                <td colspan="3" style="border-top:2px solid #1A1208; padding-top:14px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-family:Arial,sans-serif; font-size:18px; color:#2C2415; font-weight:bold;">Tổng thanh toán</td>
                      <td align="right">
                        <span style="background-color:#C9A84C; color:#1A1208; font-family:Arial,sans-serif; font-size:16px; font-weight:bold; padding:4px 12px; border-radius:4px; display:inline-block;">
                          ${formatVND(amount)}
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            ${noteRow}

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background-color:#1A1208; border-radius:0 0 20px 20px; padding:36px 40px 28px; text-align:center;">
            <p style="font-family:Arial,sans-serif; font-size:12px; color:rgba(255,255,255,0.45); line-height:1.7; margin:0 0 20px;">
              Email này được gửi tự động từ hệ thống quản lý học phí.<br/>Vui lòng không trả lời trực tiếp email này ✦
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
              <tr>
                <td style="height:1px; background-color:rgba(201,168,76,0.3);"></td>
              </tr>
            </table>
            <p style="font-family:Arial,sans-serif; font-size:11px; color:rgba(255,255,255,0.25); margin:0; letter-spacing:0.5px;">
              Cảm ơn bạn đã tin tưởng và rèn luyện!
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;
}

export async function sendReceiptEmail(params: {
  studentEmail: string;
  studentName: string;
  amount: number;
  date: string;
  note: string;
}): Promise<void> {
  const html = buildReceiptHTML(params);

  await emailjs.send(
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    {
      email: params.studentEmail,
      student_name: params.studentName,
      amount: formatVND(params.amount),
      date: formatDate(params.date),
      note: params.note || "—",
      html_content: html,
    },
    EMAILJS_PUBLIC_KEY,
  );
}
