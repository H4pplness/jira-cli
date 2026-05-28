# jira-cli

`jira-cli` là công cụ dòng lệnh để thao tác với Jira. CLI này lưu cấu hình server, credential và context ở máy local, sau đó cho phép tìm kiếm, xem, tạo, sửa, comment và chuyển trạng thái issue ngay trong terminal.

## Tính năng

- Wizard đăng nhập nhanh.
- Hỗ trợ nhiều context cho nhiều môi trường, công ty, project hoặc credential.
- Hỗ trợ Jira Cloud và Jira Data Center/Server.
- Hỗ trợ Basic auth bằng email Atlassian + API token, Personal Access Token và OAuth2 access token.
- Tìm issue bằng JQL hoặc các filter phổ biến.
- Xem, tạo, sửa, comment và chuyển trạng thái issue.
- Liệt kê, xem, tạo và sửa epic.
- Liệt kê và xem chi tiết project.

## Yêu cầu

- Node.js 20 trở lên.
- Quyền truy cập vào Jira Cloud, Data Center hoặc Server.
- Jira API token, PAT hoặc OAuth2 access token.

## Cài đặt

Cài dependencies:

```sh
npm install
```

Chạy trực tiếp trong project:

```sh
npm start -- --help
```

Link CLI thành lệnh `jira` trên máy:

```sh
npm link
jira --help
```

## Bắt đầu nhanh

Chạy wizard đăng nhập:

```sh
jira login
```

Wizard sẽ tạo:

- một server,
- một credential,
- một context ghép server và credential.

Với Jira Cloud, chọn `basic` và dùng email Atlassian cùng API token tạo tại:

```txt
https://id.atlassian.com/manage-profile/security/api-tokens
```

Với Jira Data Center/Server, chọn `pat` và nhập Personal Access Token.

## Sử dụng hằng ngày

Tìm issue:

```sh
jira issue search --project PROJ --status "In Progress"
jira issue search "login error" --project PROJ --assignee me
jira issue search --jql 'project = "PROJ" AND status = "Done" ORDER BY updated DESC'
```

Xem issue:

```sh
jira issue view PROJ-123
jira issue view PROJ-123 --comments
```

Tạo issue:

```sh
jira issue create --project PROJ --type Bug --summary "Login crashes on invalid token"
```

Sửa issue:

```sh
jira issue edit PROJ-123 --summary "Updated summary"
jira issue edit PROJ-123 --assignee user@example.com --priority High --due 2026-06-30
```

Thêm comment:

```sh
jira issue comment PROJ-123 --message "Fixed in the latest build."
```

Chuyển trạng thái issue:

```sh
jira issue transition PROJ-123 --status Done
```

## Epic

Liệt kê epic trong project:

```sh
jira epic list --project PROJ
```

Xem epic và các issue con:

```sh
jira epic view PROJ-100
```

Tạo epic:

```sh
jira epic create --project PROJ --summary "Billing migration"
jira epic create --project PROJ --summary "Billing migration" --description "Track billing work" --due 2026-07-31
```

Sửa epic:

```sh
jira epic edit PROJ-100 --summary "Billing migration phase 2" --due 2026-07-31
```

## Project

Liệt kê project:

```sh
jira project list
```

Xem chi tiết project:

```sh
jira project view PROJ
```

Liệt kê issue type hợp lệ trong project:

```sh
jira project issue-types PROJ
```

## Cấu hình

Xem toàn bộ cấu hình:

```sh
jira config view
```

Xem context đang active:

```sh
jira config current
```

Tạo cấu hình thủ công:

```sh
jira config server add my-company --url https://company.atlassian.net --type cloud
jira config credential add my-token --type basic
jira config context add work --server my-company --credential my-token
```

Chuyển context:

```sh
jira config context list
jira config context use work
```

Chạy lệnh với context cụ thể:

```sh
jira issue search --context staging --project PROJ
jira project list --context work
```

Kiểm tra context:

```sh
jira config context test
jira config context test work
jira config context test --all
```

## Dữ liệu local

Cấu hình được lưu tại:

```txt
~/.atlassian-cli/config.json
```

File này chứa URL server, tên context và credential. Hãy xem đây là file nhạy cảm. CLI ghi file với quyền hạn chế nếu hệ điều hành hỗ trợ.

## Tham khảo lệnh

```txt
jira login [--context <name>]

jira config view
jira config current
jira config server add <name> --url <url> --type <cloud|datacenter|server>
jira config server list
jira config server remove <name>
jira config server test <name>
jira config credential add <name> --type <basic|pat|oauth2>
jira config credential list
jira config credential remove <name>
jira config credential renew <name>
jira config context add <name> --server <name> --credential <name>
jira config context list
jira config context use <name>
jira config context remove <name>
jira config context test [name] [--all]

jira issue search [query] [--project <key>] [--assignee <email|me>] [--status <status>] [--type <type>] [--limit <n>] [--jql <jql>] [--context <name>]
jira issue view <issueKey> [--comments] [--context <name>]
jira issue create [--project <key>] [--type <type>] [--summary <text>] [--parent <key>] [--context <name>]
jira issue edit <issueKey> [--summary <text>] [--assignee <email>] [--priority <priority>] [--due <date>] [--context <name>]
jira issue comment <issueKey> [--message <text>] [--context <name>]
jira issue transition <issueKey> [--status <status>] [--context <name>]

jira epic list --project <key> [--limit <n>] [--context <name>]
jira epic view <epicKey> [--context <name>]
jira epic create [--project <key>] [--summary <text>] [--description <text>] [--due <date>] [--context <name>]
jira epic edit <epicKey> [--summary <text>] [--due <date>] [--context <name>]

jira project list [--context <name>]
jira project view <projectKey> [--context <name>]
jira project issue-types <projectKey> [--context <name>]
```

## Phát triển

Chạy CLI trực tiếp:

```sh
node bin/jira.js --help
```

Các script hữu ích:

```sh
npm start
npm run link
```
