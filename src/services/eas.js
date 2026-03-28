const { EAS, SchemaEncoder } = require('@ethereum-attestation-service/eas-sdk');
const { ethers } = require('ethers');

// // VALIDATE_ENV — fail fast with a clear message instead of cryptic ethers errors later
const REQUIRED_ENV = ['EAS_CONTRACT_ADDRESS', 'RPC_URL', 'ATTESTER_PRIVATE_KEY', 'SCHEMA_UID'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`// EAS_CONFIG_ERROR: missing required env var: ${key}`);
  }
}

const EAS_CONTRACT = process.env.EAS_CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.ATTESTER_PRIVATE_KEY;
const SCHEMA_UID = process.env.SCHEMA_UID;

// // CREATE_ATTESTATION
async function createAttestation(username, activity) {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const eas = new EAS(EAS_CONTRACT);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    'string username,uint32 total_commits,uint32 total_prs_merged,uint32 velocity_score,string period_start,string period_end'
  );

  const encodedData = schemaEncoder.encodeData([
    { name: 'username',         value: username,                   type: 'string' },
    { name: 'total_commits',    value: activity.total_commits,     type: 'uint32' },
    { name: 'total_prs_merged', value: activity.total_prs_merged,  type: 'uint32' },
    { name: 'velocity_score',   value: activity.velocity_score,    type: 'uint32' },
    { name: 'period_start',     value: activity.period_start,      type: 'string' },
    { name: 'period_end',       value: activity.period_end,        type: 'string' },
  ]);

  const tx = await eas.attest({
    schema: SCHEMA_UID,
    data: {
      recipient: ethers.ZeroAddress,
      expirationTime: 0n,
      revocable: false,
      data: encodedData,
    },
  });

  const uid = await tx.wait();

  console.log(`// ATTESTATION_CREATED uid=${uid} builder=${username}`);

  return {
    uid,
    username,
    tx_hash: tx.tx.hash,
    network: 'base-sepolia',
    schema_uid: SCHEMA_UID,
    activity,
  };
}

module.exports = { createAttestation };
