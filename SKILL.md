---
name: jira-cli
description: |
  Hướng dẫn AI agent sử dụng công cụ jira-cli (lệnh `jira`) để thao tác với Jira
  trực tiếp từ terminal. Kích hoạt skill này bất cứ khi nào người dùng đề cập đến
  Jira — kể cả khi không nhắc đến "jira-cli". Các tín hiệu trigger bao gồm:
  - Nhắc đến issue, task, bug, story, epic, sprint trên Jira
  - Muốn tìm kiếm, xem, tạo, chỉnh sửa, assign, chuyển trạng thái issue/epic
  - Muốn thêm comment, đổi priority, set due date trên Jira
  - Muốn xem danh sách project hoặc thông tin project
  - Bất kỳ thao tác nào liên quan đến Jira, dù là "xem task của tôi hôm nay",
    "tạo bug cho lỗi này", "chuyển ticket sang Done", hay "assign issue cho ai đó"
  Đây là skill quan trọng — ưu tiên dùng ngay khi có bất kỳ dấu hiệu nào liên
  quan đến Jira, không cần người dùng nói rõ "dùng jira-cli".
---

# Jira CLI Skill

Agent dùng lệnh `jira` (đã cài và cấu hình) để tương tác với Jira Cloud hoặc
Data Center trực tiếp từ terminal. Mọi thao tác đều thực hiện qua `bash_tool`.

---

## 0. Kiểm tra trước khi dùng

```bash
jira config current   # xem context đang active
```

Nếu báo "Chưa có context" → hướng dẫn người dùng chạy `jira login`.

---

## 1. Đăng nhập lần đầu

```bash
jira login                    # wizard 3 bước: server → auth → tên context
jira login --context staging  # đăng nhập thêm môi trường mới
```

Wizard sẽ hỏi:
- **Host URL** — vd: `https://company.atlassian.net`
- **Loại** — Cloud hoặc Data Center/Server
- **Auth** — Basic (email + API Token) hoặc PAT
- **Tên context** — vd: `default`, `staging`, `work`

---

## 2. Tìm kiếm issue

```bash
# Từ khóa
jira issue search "login bug"

# Filter đơn
jira issue search --project PROJ
jira issue search --assignee me
jira issue search --status "In Progress"
jira issue search --type Bug

# Kết hợp nhiều filter
jira issue search --project PROJ --assignee me --type Bug --limit 30

# JQL tùy chỉnh (mạnh nhất, bỏ qua mọi filter khác)
jira issue search --jql 'project = PROJ AND sprint in openSprints() ORDER BY priority DESC'
jira issue search --jql 'assignee = currentUser() AND status != Done ORDER BY updated DESC'
```

| Flag | Ví dụ | Ghi chú |
|---|---|---|
| `--project` | `PROJ` | Project key |
| `--assignee` | `me` hoặc `user@email.com` | `me` = currentUser() |
| `--status` | `"In Progress"` | Nháy kép nếu có dấu cách |
| `--type` | `Bug`, `Story`, `Task`, `Epic` | |
| `--limit` | `50` | Mặc định 20 |
| `--jql` | chuỗi JQL | Ưu tiên cao nhất |
| `--context` | `staging` | Override active context |

---

## 3. Xem chi tiết issue

```bash
jira issue view PROJ-123              # thông tin cơ bản
jira issue view PROJ-123 --comments   # kèm toàn bộ comments
```

Output gồm: summary, status, priority, assignee, reporter, due date,
description, subtasks, labels, và (nếu có `--comments`) toàn bộ comment thread.

---

## 4. Tạo issue mới

Nếu không chắc project hỗ trợ issue type nào, kiểm tra trước:

```bash
jira project issue-types PROJ
```

```bash
# Nhanh qua flags — KHUYẾN NGHỊ cho agent (tránh interactive)
jira issue create --project PROJ --type Task    --summary "Tên task"
jira issue create --project PROJ --type Bug     --summary "Login bị crash khi dùng OAuth"
jira issue create --project PROJ --type Story   --summary "User có thể reset mật khẩu"
jira issue create --project PROJ --type Sub-task --summary "Viết unit test" --parent PROJ-10
```

> **Quan trọng:** Luôn truyền đủ `--project`, `--type`, `--summary` khi agent
> chạy tự động. Thiếu flag → CLI hỏi interactive → terminal bị treo.

---

## 5. Tạo epic mới

```bash
jira epic create --project PROJ --summary "Tên epic Q4"
jira epic create --project PROJ --summary "Tên epic Q4" --description "Mô tả epic" --due 2025-12-31
```

---

## 6. Chỉnh sửa issue

```bash
# Từng field riêng lẻ
jira issue edit PROJ-123 --summary "Tiêu đề mới"
jira issue edit PROJ-123 --assignee dev@company.com
jira issue edit PROJ-123 --priority High
jira issue edit PROJ-123 --due 2025-12-31

# Kết hợp nhiều field cùng lúc
jira issue edit PROJ-123 --priority High --assignee dev@company.com --due 2025-12-31
```

**Priority hợp lệ:** `Highest` `High` `Medium` `Low` `Lowest`
**Format ngày:** `YYYY-MM-DD`

---

## 7. Chỉnh sửa epic

```bash
jira epic edit PROJ-10 --summary "Tên epic mới"
jira epic edit PROJ-10 --due 2025-12-31
jira epic edit PROJ-10 --summary "Tên mới" --due 2025-12-31
```

---

## 8. Chuyển trạng thái (Transition)

```bash
# Chuyển trực tiếp bằng tên status
jira issue transition PROJ-123 --status "In Progress"
jira issue transition PROJ-123 --status "In Review"
jira issue transition PROJ-123 --status Done
```

> Tên status phải khớp chính xác với workflow của project (phân biệt hoa thường
> không bắt buộc nhưng nên đúng). Nếu không chắc tên, chạy
> `jira issue view PROJ-123` để xem status hiện tại.

---

## 9. Thêm comment

```bash
jira issue comment PROJ-123 --message "Đã fix, cần review lại."
jira issue comment PROJ-123 --message "Deploy lên staging xong. Link: https://staging.example.com"
```

> Luôn dùng `--message` khi agent chạy tự động. Bỏ qua flag → CLI mở editor
> → terminal bị treo.

---

## 10. Xem epics trong project

```bash
jira epic list --project PROJ
jira epic view PROJ-10        # chi tiết epic + danh sách issue con
```

---

## 11. Xem project

```bash
jira project list             # tất cả project có quyền truy cập
jira project view PROJ        # chi tiết một project
jira project issue-types PROJ # các issue type hợp lệ trong project
```

---

## 12. Quản lý cấu hình (nâng cao)

```bash
# Xem toàn bộ config
jira config view
jira config current           # context đang active

# Server
jira config server list
jira config server add prod --url https://prod.atlassian.net --type cloud

# Credential
jira config credential list
jira config credential renew my-token   # làm mới token hết hạn

# Context (ghép server + credential)
jira config context list
jira config context use staging         # chuyển sang môi trường khác
jira config context test                # test kết nối active context
jira config context test --all          # test tất cả contexts
```

---

## Nguyên tắc khi agent dùng

1. **Luôn dùng flags, không để interactive** — tránh terminal bị treo.
2. **Issue key viết HOA** — `PROJ-123`, không phải `proj-123`.
3. **Nháy kép giá trị có dấu cách** — `--status "In Progress"`, `--summary "Có dấu cách"`.
4. **Lưu key sau khi tạo** — output trả về key mới (vd: `PROJ-456`), dùng cho bước tiếp theo nếu cần.
5. **Lỗi 401/403** → nhắc người dùng chạy `jira config credential renew <name>`.
6. **Lỗi "Chưa có context"** → nhắc người dùng chạy `jira login`.
7. **Multi-env** — dùng `--context <name>` để chỉ định môi trường cụ thể.
8. **Không chắc issue type** — chạy `jira project issue-types <PROJECT>` trước khi tạo issue.

---

## Ví dụ workflow thực tế

### "Tìm tất cả bug đang open của tôi trong PROJ"
```bash
jira issue search --project PROJ --type Bug --assignee me --status "To Do"
```

### "Tạo bug cho lỗi không gửi được email xác nhận"
```bash
jira issue create --project PROJ --type Bug --summary "Không gửi được email xác nhận đăng ký"
```

### "Chuyển PROJ-99 sang Done"
```bash
jira issue transition PROJ-99 --status Done
```

### "Assign PROJ-77 cho nam@company.com, set High priority, due 31/12"
```bash
jira issue edit PROJ-77 --assignee nam@company.com --priority High --due 2025-12-31
```

### "Comment vào PROJ-50 rằng đã deploy lên staging"
```bash
jira issue comment PROJ-50 --message "Đã deploy lên staging. Cần QA verify trước khi merge."
```

### "Xem tất cả issue trong sprint hiện tại của PROJ"
```bash
jira issue search --jql 'project = PROJ AND sprint in openSprints() ORDER BY priority DESC'
```
