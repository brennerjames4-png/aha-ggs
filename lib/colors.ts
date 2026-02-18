// Dynamic color palette for group members
// Colors assigned by index in the member list

const PALETTE = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
  '#14B8A6', // teal
  '#6366F1', // indigo
];

export function getMemberColor(index: number): string {
  return PALETTE[index % PALETTE.length];
}

export function getMemberColors(memberIds: string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  memberIds.forEach((id, i) => {
    colors[id] = getMemberColor(i);
  });
  return colors;
}
