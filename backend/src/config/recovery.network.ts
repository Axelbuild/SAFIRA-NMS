function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseNumber(value: string, name: string) {
  const parsed = Number(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number in environment variable: ${name}`);
  }

  return parsed;
}

function parseNumberList(value: string) {
  return value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => !Number.isNaN(item));
}

function parseOfficeSubnets(value: string) {
  return value.split(",").map((item, index) => {
    const [subnetPrefix, range] = item.split(":");

    if (!subnetPrefix || !range) {
      throw new Error(`Invalid RECOVERY_OFFICE_SUBNETS entry: ${item}`);
    }

    if (range.includes("-")) {
      const [startOctet, endOctet] = range
        .split("-")
        .map((value) => Number(value.trim()));

      return {
        name: `Office ${index + 1}`,
        subnetPrefix,
        startOctet,
        endOctet,
      };
    }

    return {
      name: `Office ${index + 1}`,
      subnetPrefix,
      fixedOctets: [Number(range.trim())],
    };
  });
}

export const recoveryNetworkConfig = {
  posts: {
    basePrefix: getRequiredEnv("RECOVERY_POST_BASE_PREFIX"),

    startRange: parseNumber(
      getRequiredEnv("RECOVERY_POST_START_RANGE"),
      "RECOVERY_POST_START_RANGE"
    ),

    endRange: parseNumber(
      getRequiredEnv("RECOVERY_POST_END_RANGE"),
      "RECOVERY_POST_END_RANGE"
    ),

    priorityOctets: parseNumberList(
      getRequiredEnv("RECOVERY_POST_PRIORITY_OCTETS")
    ),

    fallbackStartOctet: parseNumber(
      getRequiredEnv("RECOVERY_POST_FALLBACK_START_OCTET"),
      "RECOVERY_POST_FALLBACK_START_OCTET"
    ),

    fallbackEndOctet: parseNumber(
      getRequiredEnv("RECOVERY_POST_FALLBACK_END_OCTET"),
      "RECOVERY_POST_FALLBACK_END_OCTET"
    ),
  },

  offices: parseOfficeSubnets(
    getRequiredEnv("RECOVERY_OFFICE_SUBNETS")
  ),
};