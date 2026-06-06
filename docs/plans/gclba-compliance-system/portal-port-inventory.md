# Portal Port Inventory

Source inspected:
`/Users/travisgilbert/Tech Dev Local/Compliance.Thelandbank.org- Feb - 12`

The portal directory is not currently a Git worktree, so this inventory is a
read-only implementation guide. Port code only after the GCLBA atlas fork exists.

## Keep And Port

| Portal Source | Port Target | Notes |
|---|---|---|
| `src/pages/Compliance.jsx` | GCLBA fork workflow route | Main compliance workflow shell. |
| `src/pages/ActionQueue.jsx` | GCLBA fork action queue | Back with `actionQueue` GraphQL query. |
| `src/pages/CommunicationLog.jsx` | GCLBA fork communication panel | Back with `communications` query and `createWorkflowCommunication` mutation. |
| `src/pages/BatchEmail.jsx` | GCLBA fork batch communication preparation | Keep as preparation/logging. Do not send email. |
| `src/pages/TemplateManager.jsx` | GCLBA fork template admin or internal route | Back with Django `EmailTemplate` model when GraphQL coverage expands. |
| `src/pages/UpcomingMilestones.jsx` | GCLBA fork milestone rail | Back with timing and action queue data. |
| `src/pages/AuditTrail.jsx` | GCLBA fork activity/audit panel | Back with documents, communications, and future notes/events. |
| `src/components/buyer/ComplianceOverview.jsx` | Internal buyer/property summary | Keep internal unless buyer self-service is split into a separate public intake surface. |
| `src/components/buyer/DropZone.jsx` | Parcel upload dropzone | Post to Django upload endpoints, then refresh GraphQL documents/photos. |
| `src/lib/computeDueNow.js` | Reference only | Prefer Django timing services as source of truth. |
| `src/config/complianceRules.js` | Reference only | Prefer Django `Program` and workflow defaults. |

## Drop

| Portal Source | Reason |
|---|---|
| `src/lib/filemakerClient.js` | FileMaker integration is disallowed. |
| `src/lib/filemakerExport.js` | FileMaker integration is disallowed. |
| `src/config/filemakerFieldMap.js` | FileMaker integration is disallowed. |
| `src/pages/FileMakerBridge.jsx` | FileMaker integration is disallowed. |
| `src/lib/emailSender.js` | The tracker logs communications. It does not send email. |

## Decision Point

Buyer self-service should not live inside the authenticated internal tool if it
accepts external buyer submissions. Keep it as one of two paths:

1. Retire it with the standalone portal.
2. Split it into a minimal public intake surface with a narrow Django endpoint.

Do not mix public buyer intake with the internal atlas surface that contains tax,
ownership, and workflow data.
