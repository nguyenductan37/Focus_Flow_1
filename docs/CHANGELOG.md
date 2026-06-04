# CHANGELOG.md

> Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)  
> Versioning: Sprint-based (`v0.X.0`) → Semantic Versioning (`v1.0.0`) sau khi hoàn thành Sprint 5

---

## [Unreleased]

### Added
- **[PB_4]** Hoàn thành thuật toán đề xuất Quick Suggest (`/api/tasks/quick-suggest`) với custom sorting logic ưu tiên Ma trận Eisenhower và Mức năng lượng.
- **[PB_4]** Phát triển widget Quick Action cho phép người dùng lựa chọn "Tôi có 15 phút", "Tôi có 30 phút", "Tôi có 60 phút" trên giao diện React.
- **[PB_1.1]** Thêm Ma trận Eisenhower dạng thẻ Grid màu sắc nổi bật (Q1-Q4) kèm selector Mức năng lượng cho phép lọc task theo logic AND.
- **[PB_1]** Phân tích xung đột thời gian (overlap) và tự động đề xuất 3 khung giờ thay thế trong ngày cực nhanh (gần như tức thì).
- **[PB_2]** Quy trình Closure "Kết thúc Ngày" tự động chuyển trạng thái Off Mode để ẩn toàn bộ thông báo công việc đến sáng sớm hôm sau.
- **[PB_2.1]** Widget Morning Plan tổng hợp kế hoạch ngày mới nhanh chóng, tiện dụng.
- **[PB_5]** Bản đồ Growth Map tích hợp Recharts Pie-chart và Drill-down Column view hiển thị số giờ tập trung hiệu quả.
- **[PB_3]** Thuật toán tự động tìm kiếm "Khung Giờ Vàng" tỉnh táo nhất từ dữ liệu lịch sử.

---

## [v0.1.0] — Sprint 1: Decision Foundation ✅
> **Sprint Goal:** Xử lý nỗi đau "Tê liệt ra quyết định" và thiết lập khung phân loại nhiệm vụ  
> **Trạng thái:** ✅ Completed

### Added
- Setup project framework full-stack (Express + React 19).
- Unit test suite và performance benchmark cho Quick Suggest.
