// ─────────────────────────────────────────────────────────────────────────────
// CẤU HÌNH GỬI EMAIL — EMAILJS
// ─────────────────────────────────────────────────────────────────────────────
// Hướng dẫn lấy các giá trị:
//  1. Đăng ký / đăng nhập tại https://www.emailjs.com
//  2. Vào "Email Services" → "Add New Service" → chọn Gmail (hoặc Outlook, ...)
//     → kết nối tài khoản → ghi lại **Service ID** (dạng: service_xxxxxxx)
//  3. Vào "Email Templates" → "Create New Template":
//       Subject : Biên lai học phí — {{student_name}}
//       Body    : (chọn "Code Editor" rồi dán toàn bộ nội dung
//                  file src/receipt-template-preview.html vào)
//     → Save → ghi lại **Template ID** (dạng: template_xxxxxxx)
//  4. Vào "Account" → "General" → sao chép **Public Key**
//
// Sau đó điền vào 3 hằng số bên dưới:
// ─────────────────────────────────────────────────────────────────────────────

export const EMAILJS_SERVICE_ID  = "service_ipklbl8";   // ← dán Service ID
export const EMAILJS_TEMPLATE_ID = "template_mcmcbs9";  // ← dán Template ID
export const EMAILJS_PUBLIC_KEY  = "QzITKh7KQbUTPPrqW";   // ← dán Public Key

// Tên giảng viên hiển thị trong biên lai (tuỳ chỉnh)
export const TEACHER_NAME = "Tuan PT STUDIO PRODUCTIONS";
