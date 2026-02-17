import { AuditLog } from './audit-log.entity';

export function presentAuditLog(log: AuditLog) {
  const actor = log.metadata?.actor;

  const actorName =
    actor?.name || actor?.email || `${log.actorType} ${log.actorId}`;

  let description = '';

  switch (log.action) {
    case 'LOGIN':
      description = `${actorName} logged in`;
      break;

    case 'UPLOAD_MEETINGS':
      description = `${actorName} uploaded meeting records`;
      break;

    case 'UPLOAD_PIPELINE':
      description = `${actorName} uploaded pipeline data`;
      break;

    case 'CREATE_PIPELINE_OPPORTUNITY':
      description = `${actorName} created a pipeline opportunity`;
      break;

    case 'UPDATE_PIPELINE_OPPORTUNITY':
      description = `${actorName} updated a pipeline opportunity`;
      break;

    case 'SET_PASSWORD':
      description = `${actorName} set their password`;
      break;

    case 'DELETE_OPPORTUNITY':
      description = `${actorName} deleted a pipeline opportunity`;
      break;

    case 'DELETE_MEETING':
      description = `${actorName} deleted a meeting`;
      break;

    default:
      description = `${actorName} performed ${log.action
        .toLowerCase()
        .replace(/_/g, ' ')}`;
  }

  return {
    id: log.id,
    actorType: log.actorType,
    actorId: log.actorId,
    actor, // resolved metadata
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    description,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    createdAt: log.createdAt,
  };
}
