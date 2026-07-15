const NICKNAME_PATTERN = /^[a-z0-9]+-[a-z0-9]+(\d*)$/

function getFirstWord(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)[0] ?? ''
}

export function normalizeNicknamePart(value) {
  return getFirstWord(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function buildNicknameBase(name, lastName) {
  const firstName = normalizeNicknamePart(name)
  const firstLastName = normalizeNicknamePart(lastName)

  if (!firstName || !firstLastName) {
    return ''
  }

  return `${firstName}-${firstLastName}`
}

export function formatNicknameSuffix(rank) {
  if (rank <= 1) {
    return ''
  }

  return String(rank).padStart(2, '0')
}

export function buildFullNickname(base, suffix = '') {
  const normalizedBase = String(base ?? '').trim().toLowerCase()
  const normalizedSuffix = String(suffix ?? '').replace(/\D/g, '')

  if (!normalizedBase) {
    return ''
  }

  return `${normalizedBase}${normalizedSuffix}`
}

export function parseNicknameSuffix(fullNickname, base) {
  const normalizedFull = String(fullNickname ?? '').trim().toLowerCase()
  const normalizedBase = String(base ?? '').trim().toLowerCase()

  if (!normalizedFull.startsWith(normalizedBase)) {
    return ''
  }

  return normalizedFull.slice(normalizedBase.length).replace(/\D/g, '')
}

export function isValidNickname(nickname) {
  return NICKNAME_PATTERN.test(String(nickname ?? '').trim().toLowerCase())
}

export function profilesShareNicknameBase(profile, name, lastName) {
  return buildNicknameBase(profile?.name, profile?.last_name) === buildNicknameBase(name, lastName)
}

export function getMatchingProfilesByBase(profiles, name, lastName, excludeProfileId = null) {
  const base = buildNicknameBase(name, lastName)

  if (!base) {
    return []
  }

  return (profiles ?? []).filter((profile) => {
    if (excludeProfileId && profile.id === excludeProfileId) {
      return false
    }

    return profilesShareNicknameBase(profile, name, lastName)
  })
}

export function getSuggestedNicknameSuffix(profiles, name, lastName, excludeProfileId = null) {
  const matches = getMatchingProfilesByBase(profiles, name, lastName, excludeProfileId)
  return formatNicknameSuffix(matches.length + 1)
}

export function isNicknameSuffixRequired(profiles, name, lastName, excludeProfileId = null) {
  return getMatchingProfilesByBase(profiles, name, lastName, excludeProfileId).length > 0
}

export function isNicknameTaken(profiles, nickname, excludeProfileId = null) {
  const normalizedNickname = String(nickname ?? '').trim().toLowerCase()

  return (profiles ?? []).some((profile) => {
    if (excludeProfileId && profile.id === excludeProfileId) {
      return false
    }

    return String(profile.nickname ?? '').trim().toLowerCase() === normalizedNickname
  })
}

export function getNicknameValidationError({
  name,
  lastName,
  suffix,
  profiles,
  excludeProfileId = null,
}) {
  const base = buildNicknameBase(name, lastName)
  const fullNickname = buildFullNickname(base, suffix)

  if (!base) {
    return 'Ingresa nombre y apellido para generar la credencial de acceso.'
  }

  if (!isValidNickname(fullNickname)) {
    return 'La credencial solo puede usar letras, numeros y un guion entre nombre y apellido.'
  }

  if (isNicknameTaken(profiles, fullNickname, excludeProfileId)) {
    return 'Esta credencial ya esta en uso. Agrega numeracion.'
  }

  if (isNicknameSuffixRequired(profiles, name, lastName, excludeProfileId) && !suffix) {
    return 'Ya existe un usuario con el mismo nombre y apellido. Debes agregar numeracion.'
  }

  return null
}
