interface PublicEntityIdentifier {
  id: string;
  slug?: string | null;
}

function encodePathSegment(value: string) {
  return encodeURIComponent(value.trim());
}

export function getPublicIdentifier(entity: PublicEntityIdentifier) {
  return entity.slug?.trim() || entity.id;
}

export function getTalentPath(entity: PublicEntityIdentifier) {
  return `/talents/${encodePathSegment(getPublicIdentifier(entity))}`;
}

export function getEventPath(entity: PublicEntityIdentifier) {
  return `/events/${encodePathSegment(getPublicIdentifier(entity))}`;
}

export function normalizePublicIdentifier(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  try {
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export function matchesPublicIdentifier(
  entity: PublicEntityIdentifier,
  identifier: string
) {
  const normalizedIdentifier = normalizePublicIdentifier(identifier);
  return normalizedIdentifier === entity.id || normalizedIdentifier === (entity.slug?.trim() ?? "");
}
