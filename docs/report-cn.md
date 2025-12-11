## 概述
这是一个健身活动管理应用，访客可以搜索公开活动，注册用户可以记录个人活动并按多种条件筛选、查看统计与图表、导出数据。提供 REST API 和交互式文档页面。技术栈为 Node.js/Express/EJS/MySQL + Chart.js。

## 架构
```
[浏览器] <--HTTPS--> [Express/Node.js]
  |                        |
  | EJS + Chart.js         +-- 会话中间件
  | fetch API              +-- Helmet（安全头）
  | CSRF 令牌              +-- CSRF 保护
  |                        +-- Rate Limiting
  |                        +-- 静态文件服务
  |                        +-- 路由模块：
  |                             ├── auth.js（注册、登录、密码管理）
  |                             ├── main.js（活动 CRUD、个人资料、管理员）
  |                             ├── internal.js（图表、导出、统计 API）
  |                             └── api.js（REST API + Bearer Token）
  |                        |
  |                   [MySQL 驱动]
  |                        |
  |                   [MySQL 数据库]
                      ├── users（用户表）
                      ├── fitness_activities（健身活动表）
                      ├── email_verifications（邮箱/密码验证表）
                      └── audit_logs（审计日志表）
```

应用采用两层 MVC 架构。应用层运行 Express，配合会话、Helmet、CSRF、Rate Limiting 等分层中间件和 4 个路由模块，EJS 在服务器端渲染页面，Chart.js 通过 fetch 调用内部 API 做客户端可视化。数据层使用 MySQL 存储用户、活动、验证码和审计日志，采用参数化查询防止 SQL 注入。

## 数据模型
```
users(id, username, password, email, first_name, last_name, is_admin, created_at)
fitness_activities(id, user_id, activity_type, activity_time, duration_minutes,
                   distance_km, calories_burned, notes, is_public, created_at)
email_verifications(id, user_id, new_email, verification_code, 
                    created_at, expires_at, used_at)
audit_logs(id, user_id, username, event_type, resource_type, resource_id,
           changes, ip_address, user_agent, path, method, created_at)
```
users 通过 user_id 与 fitness_activities 一对多关联。email_verifications 存储邮箱修改和密码重置的验证码，expires_at 控制过期时间。audit_logs 记录安全操作和资源变更，changes 字段用 JSON 存储详细修改内容，支持按 event_type、user_id、created_at 查询。activity_time、activity_type、user_id 建有索引优化查询性能。

## 用户功能
应用包含主页、关于、搜索筛选、数据录入、日志查看等页面，默认用户名密码为 `gold`/`smiths`。管理员账户为 `admin`/`qwerty`，可以查看审计日志以及查看和删除所有用户和活动记录。

用户可以注册、登录、登出，忘记密码时通过邮箱验证码重置密码（使用 Nodemailer 发送邮件）。登录后可以修改个人信息、修改密码、修改邮箱、删除账户，关键操作会被记录以便审计。

搜索活动页面向所有访客开放，无需登录即可使用。可以按活动类型、日期范围、时长范围、卡路里范围组合筛选公开活动，支持日期、卡路里、时长排序和 10/25/50/100 条分页，筛选条件刷新后仍会保留；结果可直接导出为 CSV。

用户可以创建、编辑、删除自己的活动记录，包括类型、时间、时长、距离、卡路里、备注和是否公开等字段。

在我的活动页面，用户可以查看个人活动列表，享受与搜索页相同的分页、筛选和排序体验，对已有活动进行编辑或删除。页面会汇总当前筛选的数据，展示活动数、总时长、总距离、总卡路里、最大强度、平均强度，并配套圆环图（类型分布）和折线图（每日卡路里）。

提供自助式 API 文档页 `/api-builder`，列出所有可用接口，便于快速测试和对接。

## 高级技术

**登录/会话与安全基线**：使用 bcrypt 哈希存储密码，express-session 维持登录态；所有表单和 AJAX 请求携带 CSRF 令牌并开启 Helmet 安全头；输入经 express-validator 校验与 express-sanitizer 净化；敏感账户操作（改邮箱、删账户等）写入 `audit_logs` 便于追踪。登录和注册接口配置 rate limiting 防止暴力破解。

**邮件验证与多步骤安全流**：忘记密码、修改邮箱、删除账户采用多步骤流程，通过 Nodemailer 发送验证码到用户邮箱（开发环境使用 Ethereal 测试账户）。这些功能使用专用页面，前端 JavaScript 控制步骤切换，后端会话保存验证码或临时邮箱，只有完成全部步骤才提交最终变更；所有关键操作计入审计日志。

**公开搜索与筛选引擎**：公共搜索页与登录用户的活动列表共用筛选构建器 `utils/filter-helper.js`，按活动类型、日期范围、时长范围、卡路里范围动态拼接 SQL 条件，参数化查询防注入；公共搜索强制 `is_public=1` 仅返回公开活动。分页、排序、CSV 导出都基于同一筛选结果，URL 查询参数持久化筛选状态。

**活动 CRUD 与输入校验**：创建/编辑活动时校验必填和数值范围（时长、距离、卡路里），净化备注等文本，写入/更新时绑定当前用户，`is_public` 控制是否可被公共搜索读取。

**个人活动的表格、统计与图表对齐**：我的活动表格、底部聚合统计（数量、时长、距离、卡路里、最大/平均强度）和 Chart.js 图表共用同一筛选数据。图表接口 `/internal/activities/charts/*` 读取当前 URL 查询参数生成聚合，确保表格、统计、图表一致。

**REST API 与 Bearer Token 认证**：`/api-builder` 页面提供交互式测试界面，包括 Bearer Token 认证（`POST /api/auth/token`）、活动列表（`GET /api/activities`，无 token 返回公开活动，有 token 返回个人所有活动）、单条查询（`GET /api/activities/:id`）、统计聚合（`GET /api/activities/stats`）、创建（`POST /api/activities`）、更新（`PATCH /api/activities/:id`）、删除（`DELETE /api/activities/:id`），每个接口可生成 curl 命令或直接执行。API 路由配置独立的 rate limiting，防止滥用。

## AI 使用声明
开发过程中使用了 GitHub Copilot 作为辅助工具。在功能设计阶段，AI 帮助梳理功能清单和数据库设计思路；编码阶段提供代码补全和语法建议；调试阶段协助定位问题原因；重构时给出代码优化方向；文档撰写时润色表述。所有架构设计、功能实现和技术选型均由开发者独立完成，AI 生成的内容经过审查、测试和修改后集成。
