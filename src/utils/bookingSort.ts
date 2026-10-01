/** Lower number = higher list priority (pending first, completed last). */
export function statusSortRank(status: string): number {
  switch (status) {
    case 'pending':
    case 'offered':
    case 'survey':
      return 0
    case 'confirmed':
    case 'in-progress':
    case 'job-started':
      return 1
    case 'completed':
    case 'cancelled':
    case 'disputed':
      return 2
    default:
      return 1
  }
}

/**
 * Mongo aggregation-friendly sort stages for admin/driver job lists:
 * pending group → confirmed group → completed group, then pickupDate asc.
 */
export const STATUS_PRIORITY_ADD_FIELDS = {
  $addFields: {
    _statusRank: {
      $switch: {
        branches: [
          { case: { $in: ['$status', ['pending', 'offered', 'survey']] }, then: 0 },
          {
            case: { $in: ['$status', ['confirmed', 'in-progress', 'job-started']] },
            then: 1,
          },
          {
            case: { $in: ['$status', ['completed', 'cancelled', 'disputed']] },
            then: 2,
          },
        ],
        default: 1,
      },
    },
  },
}
