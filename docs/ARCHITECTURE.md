# ARCHITECTURE.md — Kiến Trúc Hệ Thống

---

## 1. Tech Stack & Services

Hệ thống được thiết kế theo mô hình Full-Stack kết hợp **React (Vite/TS)** ở frontend và **Node.js (Express)** ở backend.

### Thể hiện các Class/Data Flows chính:
1. **Frontend Client (React 19)**:
   - Sử dụng **Tailwind CSS** cho giao diện người dùng.
   - Sử dụng **Recharts** để xử lý trực quan hóa biểu đồ.
   - Quản lý trạng thái và đồng bộ hóa thời gian thực qua REST API.

2. **Backend Server (Express)**:
   - Chạy trên cổng mặc định `3000` phục vụ cả API và SPA routing tĩnh.
   - Tối ưu hóa hiệu năng nén dữ liệu nhờ phân bổ bộ nhớ trong cực nhanh.

---

## 2. API Service Layer

### `getQuickSuggest`
- Lọc các task có `estimated_min <= minutes` và trạng thái `todo` hoặc `in_progress`.
- Sắp xếp tăng dần theo `eisenhower_q` (Q1 -> Q4), sau đó sắp xếp giảm dần theo Mức Năng lượng (High -> Medium -> Low).

---

## 3. Architecture Decision Records (ADR)

### ADR-001: Express Backend + Vite SPA
- Sử dụng Express làm API Gateway tích hợp sẵn Vite middleware phục vụ tệp tin tĩnh.

### ADR-002: Soft Delete
- Các task không bao giờ bị xóa cứng (hard delete). Đánh dấu cột `deleted_at IS NOT NULL` để lưu trữ làm tư liệu hồi phục năng lượng lâu dài.
