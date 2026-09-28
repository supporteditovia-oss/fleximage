const MAX_ALEPH_JOBS_PER_V2V = 4;

function countAlephJobsInProviderTaskId(providerTaskId) {
  return String(providerTaskId || "")
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("aleph_")).length;
}

function canLaunchAnotherAlephJob(providerTaskId) {
  return (
    countAlephJobsInProviderTaskId(providerTaskId) < MAX_ALEPH_JOBS_PER_V2V
  );
}

module.exports = {
  MAX_ALEPH_JOBS_PER_V2V,
  countAlephJobsInProviderTaskId,
  canLaunchAnotherAlephJob,
};
