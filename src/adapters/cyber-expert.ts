import { sha256 } from "../hash.js";

export const CYBER_EXPERT_HARNESS_SCHEMA_ID = "aoe.cyber_expert_harness.blueprint.v1";

export type CyberExpertFocus =
  | "all"
  | "vulnerability_research"
  | "crypto_exploit_intel"
  | "msp_triage"
  | "compliance_proofs";

export interface CyberExpertHarnessRequest {
  focus?: CyberExpertFocus;
  localGpu?: boolean;
  includeMicrosoftPattern?: boolean;
  includeOpenSourceCrs?: boolean;
  includeComplianceProofs?: boolean;
}

export interface CyberExpertHarnessBlueprint {
  schemaId: typeof CYBER_EXPERT_HARNESS_SCHEMA_ID;
  generatedAt: string;
  mode: "defensive_agentic_blueprint";
  x402Stream: true;
  productId: "cyber_expert_harness_blueprint";
  focus: {
    requested: CyberExpertFocus;
    enabledTracks: string[];
  };
  researchBasis: Array<{
    sourceId: string;
    use: string;
    productDecision: string;
  }>;
  architecture: {
    principle: string;
    pipeline: Array<{
      stage: string;
      purpose: string;
      primaryAgents: string[];
      deterministicGates: string[];
      outputs: string[];
    }>;
    agentRoles: Array<{
      agentId: string;
      scope: string;
      allowedTools: string[];
      blockedTools: string[];
      successCriteria: string[];
    }>;
  };
  modelAndRuntimePlan: {
    localFirst: boolean;
    windowsGpuWorker: {
      preferred: boolean;
      resourcePosture: string[];
      allowedServingModes: string[];
      blockedModes: string[];
    };
    modelPanel: Array<{
      role: string;
      candidates: string[];
      reason: string;
    }>;
    trainingPlan: {
      recommendation: string;
      fineTuneOnlyFor: string[];
      ragOnlyFor: string[];
      prohibitedTrainingData: string[];
      openAiOption: string;
    };
  };
  dataAndProofPlan: {
    allowedSourceClasses: string[];
    cryptoExploitIntel: string[];
    sanctionsAndKyt: string[];
    proofObject: {
      publicFields: string[];
      privateFields: string[];
      postingPolicy: string[];
    };
  };
  evaluationPlan: Array<{
    evalId: string;
    measures: string;
    passCondition: string;
  }>;
  implementationPlan: Array<{
    phase: string;
    deliverable: string;
    repos: string[];
    exitCriteria: string[];
  }>;
  safety: {
    liveSettlementAllowed: false;
    externalSideEffectsAllowed: false;
    activeScanningAllowed: false;
    exploitPayloadGenerationAllowed: false;
    outputPolicy: string[];
  };
  evidenceProof: {
    algorithm: "sha256";
    canonicalization: "stable-json-sorted-keys-v1";
    blueprintHash: string;
  };
}

export function buildCyberExpertHarnessBlueprint(request: CyberExpertHarnessRequest = {}): CyberExpertHarnessBlueprint {
  const focus = request.focus ?? "all";
  const enabledTracks = enabledTracksForFocus(focus);
  const includeMicrosoftPattern = request.includeMicrosoftPattern ?? true;
  const includeOpenSourceCrs = request.includeOpenSourceCrs ?? true;
  const includeComplianceProofs = request.includeComplianceProofs ?? true;
  const localFirst = request.localGpu ?? true;

  const blueprintWithoutProof = {
    schemaId: CYBER_EXPERT_HARNESS_SCHEMA_ID,
    generatedAt: new Date().toISOString(),
    mode: "defensive_agentic_blueprint" as const,
    x402Stream: true as const,
    productId: "cyber_expert_harness_blueprint" as const,
    focus: {
      requested: focus,
      enabledTracks,
    },
    researchBasis: buildResearchBasis(includeMicrosoftPattern, includeOpenSourceCrs, includeComplianceProofs),
    architecture: {
      principle:
        "Treat the model as one input inside a bounded harness: prepare, scan, debate, deduplicate, prove safely, patch or recommend, and record provenance.",
      pipeline: [
        {
          stage: "prepare",
          purpose: "Normalize source material, buyer inventory, repo metadata, and authorized scope into a case file.",
          primaryAgents: ["scope_cartographer", "source_rights_auditor", "threat_modeler"],
          deterministicGates: ["authorization_required", "source_rights_required", "secret_redaction_required"],
          outputs: ["case_manifest", "attack_surface_map", "source_rights_envelope"],
        },
        {
          stage: "scan",
          purpose: "Run narrow expert agents over code, CVE lists, dependency inventories, and crypto incident indicators.",
          primaryAgents: ["code_auditor", "vuln_priority_analyst", "crypto_exploit_intel_analyst"],
          deterministicGates: ["read_only_tools_only", "no_external_scan", "no_wallet_or_trade_actions"],
          outputs: ["candidate_findings", "affected_asset_map", "incident_similarity_notes"],
        },
        {
          stage: "validate",
          purpose: "Use independent debater agents and source-backed evidence to challenge reachability, severity, and buyer relevance.",
          primaryAgents: ["exploitability_debater", "false_positive_hunter", "remediation_reviewer"],
          deterministicGates: ["minimum_two_evidence_sources", "buyer_inventory_match_required", "no_unverified_critical_claims"],
          outputs: ["validated_findings", "rejected_findings", "confidence_scores"],
        },
        {
          stage: "dedup",
          purpose: "Collapse equivalent findings across CVEs, packages, repos, transactions, and incident clusters.",
          primaryAgents: ["semantic_deduper", "patch_lineage_mapper"],
          deterministicGates: ["stable_finding_id", "canonical_source_links"],
          outputs: ["deduped_findings", "lineage_graph"],
        },
        {
          stage: "prove",
          purpose: "Produce defensive proof of affectedness and remediation readiness without publishing weaponizable payloads.",
          primaryAgents: ["safe_proof_planner", "sandbox_reproducer", "patch_verifier"],
          deterministicGates: ["authorized_sandbox_only", "no_live_target_execution", "no_payload_disclosure"],
          outputs: ["proof_summary", "reproduction_status", "patch_validation_status"],
        },
        {
          stage: "report",
          purpose: "Create buyer-readable packets, internal tickets, model eval traces, and optional public-safe proof commitments.",
          primaryAgents: ["client_report_writer", "ticket_builder", "proof_commitment_writer"],
          deterministicGates: ["output_policy_check", "human_review_for_high_impact_actions", "public_private_field_split"],
          outputs: ["json_report", "html_summary", "ticket_queue", "proof_commitment"],
        },
      ],
      agentRoles: buildAgentRoles(includeComplianceProofs),
    },
    modelAndRuntimePlan: {
      localFirst,
      windowsGpuWorker: {
        preferred: localFirst,
        resourcePosture: [
          "Run inference as a capped worker instead of a global system service.",
          "Keep model downloads explicit and inventory-backed before GPU allocation.",
          "Use small specialist models locally and route heavy eval or distillation jobs to cloud only after dataset review.",
          "Preserve gaming/local-inference headroom by enforcing concurrency, VRAM, and job-duration limits.",
        ],
        allowedServingModes: ["Ollama or llama.cpp for local GGUF inference", "vLLM for higher-throughput local or cloud serving", "containerized QLoRA jobs"],
        blockedModes: ["unbounded background training", "silent model downloads", "live target scanning", "wallet signing or trading tools"],
      },
      modelPanel: [
        {
          role: "heavy_reasoner",
          candidates: ["frontier API model with cyber safeguards", "Qwen-family local model", "Gemma-family local model"],
          reason: "Use for cross-file reasoning, case synthesis, and high-value debate passes.",
        },
        {
          role: "specialist_defensive_cyber",
          candidates: ["Cisco Foundation-Sec style model", "RedSage/Qwen security-tuned model", "local LoRA adapter over a strong code model"],
          reason: "Use for CVE taxonomy, remediation framing, and defensive triage language.",
        },
        {
          role: "cheap_debater",
          candidates: ["small local code model", "distilled local model", "rules-first validator"],
          reason: "Use at high volume to challenge findings before expensive validation.",
        },
        {
          role: "embedding_retriever",
          candidates: ["nomic-embed-text", "bge-family embeddings", "provider embeddings with source-rights review"],
          reason: "Use for source-grounded retrieval over CVE, incident, repo, and compliance corpora.",
        },
      ],
      trainingPlan: {
        recommendation:
          "Start with RAG plus deterministic harness behavior, then fine-tune only on derived, rights-cleared demonstrations for output format, refusal boundaries, taxonomy, and escalation decisions.",
        fineTuneOnlyFor: [
          "structured report JSON",
          "defensive remediation tone",
          "source-rights and safety refusals",
          "finding taxonomy and prioritization labels",
          "agent routing and escalation examples",
        ],
        ragOnlyFor: [
          "current CVE, KEV, EPSS, NVD, OSV, MSRC, GitHub advisory, and vendor facts",
          "TRM, Chainabuse, OFAC, KYT, and private compliance responses",
          "recent crypto exploit incident details",
          "repository code and customer inventory",
        ],
        prohibitedTrainingData: [
          "raw vendor or partner API payloads without training rights",
          "private TRM/KYT screening results",
          "wallet addresses or personal data that can be proven with commitments instead",
          "unpatched exploit instructions, weaponized proof-of-concept code, or credential material",
        ],
        openAiOption:
          "Use OpenAI fine-tuning only after evals exist and the dataset is a small JSONL corpus of rights-cleared demonstrations; keep changing facts in retrieval, not weights.",
      },
    },
    dataAndProofPlan: {
      allowedSourceClasses: [
        "official public APIs and downloads",
        "public docs and repository metadata",
        "rights-reviewed open datasets",
        "buyer-provided authorized inventory",
        "derived summaries with source links and retrieval timestamps",
      ],
      cryptoExploitIntel: [
        "Normalize public incident metadata into actor, protocol, chain, root cause, control failure, loss range, and remediation fields.",
        "Rank exploit relevance by similarity to buyer exposures and public exploit evidence.",
        "Keep exploit mechanics at defensive-abstraction level unless a private authorized sandbox explicitly needs reproduction.",
      ],
      sanctionsAndKyt: includeComplianceProofs
        ? [
            "Use OFAC as official sanctions source material.",
            "Use TRM or equivalent KYT only as a private screening adapter with provider terms review.",
            "Publish proof commitments or attestations, not raw wallet addresses or vendor responses.",
          ]
        : ["Compliance proof lane disabled for this blueprint request."],
      proofObject: {
        publicFields: ["schemaId", "decision", "decisionTime", "subjectCommitment", "sourceMerkleRoot", "policyVersion", "expiry", "issuerSignature"],
        privateFields: ["raw wallet address", "vendor KYT response", "case salt", "analyst notes", "customer identifiers"],
        postingPolicy: [
          "Post only commitments, hashes, expiry, and non-sensitive decision metadata.",
          "Keep re-screening requirements explicit because sanctions and threat intel are time-sensitive.",
          "Never imply a public proof is a permanent legal clearance.",
        ],
      },
    },
    evaluationPlan: [
      {
        evalId: "false_positive_pressure",
        measures: "How often the harness rejects weak findings before buyer-facing output.",
        passCondition: "Every critical finding has independent evidence, reachability rationale, and caveats.",
      },
      {
        evalId: "safe_output_boundary",
        measures: "Whether reports avoid exploit payloads, credentials, unauthorized scanning, and live target actions.",
        passCondition: "All outputs contain defensive policy fields and fail closed on ambiguous authorization.",
      },
      {
        evalId: "source_freshness",
        measures: "Whether current facts come from live retrieval or timestamped cache records.",
        passCondition: "Reports include source ids, URLs, retrieval time, TTL, and degraded-source status.",
      },
      {
        evalId: "harness_portability",
        measures: "Whether model changes require config updates rather than pipeline rewrites.",
        passCondition: "Agent roles, tools, gates, and evals remain stable when swapping model providers.",
      },
    ],
    implementationPlan: [
      {
        phase: "phase_0_contract",
        deliverable: "This AOE blueprint stream plus tests and source-rights registry entries.",
        repos: ["agent-opportunity-exchange"],
        exitCriteria: ["route discovery includes the stream", "readiness reports side-effect-free status", "tests prove no active scanning or payload output"],
      },
      {
        phase: "phase_1_case_store",
        deliverable: "Case manifest, source evidence envelope, and local RAG index builder.",
        repos: ["agent-opportunity-exchange", "cyber-threat-bot"],
        exitCriteria: ["CISA/NVD/EPSS/OSV facts are indexed with TTLs", "buyer inventory remains private", "no raw source resale"],
      },
      {
        phase: "phase_2_local_harness",
        deliverable: "Windows GPU worker with capped local inference and specialist agent routing.",
        repos: ["Sapphire", "agent-opportunity-exchange"],
        exitCriteria: ["worker health reports model inventory", "job queue enforces resource caps", "0G integration remains untouched"],
      },
      {
        phase: "phase_3_validation_and_proofs",
        deliverable: "Debate, dedup, proof summary, patch verification, and compliance commitment lanes.",
        repos: ["agent-opportunity-exchange", "0guard"],
        exitCriteria: ["public proof object excludes raw addresses", "HITL gates are enforced in code", "proof records have expiry and policy versions"],
      },
      {
        phase: "phase_4_eval_and_paid_artifacts",
        deliverable: "CyberGym/OSS-CRS-informed eval harness and x402/testnet paid expert packets.",
        repos: ["agent-opportunity-exchange", "cyber-threat-bot"],
        exitCriteria: ["eval suite tracks false positives and safe refusals", "paid output is derived analysis", "live settlement remains disabled until compliance review"],
      },
    ],
    safety: {
      liveSettlementAllowed: false as const,
      externalSideEffectsAllowed: false as const,
      activeScanningAllowed: false as const,
      exploitPayloadGenerationAllowed: false as const,
      outputPolicy: [
        "Defensive research, triage, remediation planning, and source-cited education only.",
        "No exploit payloads, credential material, malware, evasion steps, or unauthorized target interaction.",
        "No live trading, wallet signing, sanctions clearance claims, or Telegram/customer sends.",
        "Human review is required before patch application, compliance decisioning, public disclosure, or any external action.",
      ],
    },
  } satisfies Omit<CyberExpertHarnessBlueprint, "evidenceProof">;

  return {
    ...blueprintWithoutProof,
    evidenceProof: {
      algorithm: "sha256",
      canonicalization: "stable-json-sorted-keys-v1",
      blueprintHash: sha256(blueprintWithoutProof),
    },
  };
}

function enabledTracksForFocus(focus: CyberExpertFocus): string[] {
  const tracks = {
    vulnerability_research: "authorized vulnerability research and remediation validation",
    crypto_exploit_intel: "crypto exploit intelligence and protocol-risk synthesis",
    msp_triage: "MSP/SMB exploited-vulnerability prioritization",
    compliance_proofs: "private KYT/sanctions screening with public-safe proof commitments",
  } as const;

  if (focus === "all") return Object.values(tracks);
  return [tracks[focus]];
}

function buildResearchBasis(includeMicrosoftPattern: boolean, includeOpenSourceCrs: boolean, includeComplianceProofs: boolean) {
  return [
    ...(includeMicrosoftPattern
      ? [
          {
            sourceId: "microsoft_mdash_blog",
            use: "Model MDASH as a prepare, scan, validate, dedup, prove, and report harness with specialized agents.",
            productDecision: "Do not imitate Microsoft branding; copy the architecture lesson that the harness is the product.",
          },
          {
            sourceId: "microsoft_agent_defense_in_depth",
            use: "Use microservice-style agent scopes, least privilege, deterministic HITL, and distinct agent identity.",
            productDecision: "Enforce high-impact gates in TypeScript orchestrator code, not model discretion.",
          },
          {
            sourceId: "microsoft_security_copilot_docs",
            use: "Treat agents, plugins, connectors, and promptbooks as separate concepts with typed interfaces.",
            productDecision: "Build AOE expert tools as explicit stream/adapters rather than an everything-agent.",
          },
        ]
      : []),
    ...(includeOpenSourceCrs
      ? [
          {
            sourceId: "cybergym_benchmark",
            use: "Adopt vulnerability reproduction metrics as an eval pattern without shipping weaponized output.",
            productDecision: "Evaluate the harness on source-grounded tasks and track false positives, not just model confidence.",
          },
          {
            sourceId: "oss_crs",
            use: "Use a local, composable CRS framework concept with resource control and standardized interfaces.",
            productDecision: "Design our worker and agent protocol to be local-first and budget-aware.",
          },
          {
            sourceId: "team_atlanta_atlantis",
            use: "Study the winning CRS pattern for localization, analysis, triage, and patching.",
            productDecision: "Keep bug-finding and patch-verification lanes separate from public reporting.",
          },
          {
            sourceId: "anthropic_mythos_public",
            use: "Use the public Mythos/Claude Security lesson: advanced cyber agents need constrained access and human-reviewed patches.",
            productDecision: "Never expose an autonomous offensive surface; all patch and disclosure actions require review.",
          },
        ]
      : []),
    ...(includeComplianceProofs
      ? [
          {
            sourceId: "trm_sanctions_docs",
            use: "Treat KYT and sanctions screening as a private adapter.",
            productDecision: "Store vendor responses privately and publish only commitments or attestations.",
          },
          {
            sourceId: "ofac_sanctions_lists",
            use: "Use OFAC as the official sanctions data anchor.",
            productDecision: "Screening freshness and expiry must be visible in every proof object.",
          },
        ]
      : []),
  ];
}

function buildAgentRoles(includeComplianceProofs: boolean) {
  return [
    {
      agentId: "scope_cartographer",
      scope: "Builds the authorized case boundary from repo, inventory, and buyer-provided context.",
      allowedTools: ["read-only repo metadata", "authorized inventory parser", "source registry"],
      blockedTools: ["external scanners", "credential access", "production writes"],
      successCriteria: ["authorized scope is explicit", "unknown scope fails closed", "sensitive fields are marked private"],
    },
    {
      agentId: "source_rights_auditor",
      scope: "Checks whether each source can be used for derived analysis, training, caching, or resale.",
      allowedTools: ["source catalog", "rights envelope checks", "short citation builder"],
      blockedTools: ["paywall bypass", "raw source resale", "training on terms-restricted payloads"],
      successCriteria: ["each source has rights status", "restricted sources are RAG-only", "output contains attribution"],
    },
    {
      agentId: "code_auditor",
      scope: "Reviews authorized code paths and proposes candidate defensive findings.",
      allowedTools: ["static code search", "language-aware index", "safe local tests"],
      blockedTools: ["live exploit execution", "malware generation", "unauthorized fuzzing"],
      successCriteria: ["finding has affected path", "trust boundary is named", "remediation direction is clear"],
    },
    {
      agentId: "vuln_priority_analyst",
      scope: "Ranks CVEs and package vulnerabilities using current public exploit and severity evidence.",
      allowedTools: ["CISA KEV", "NVD", "FIRST EPSS", "OSV"],
      blockedTools: ["PoC retrieval for offense", "credential dumps", "dark-web claims without source review"],
      successCriteria: ["tier rationale is source-backed", "asset affectedness is separated from global severity", "no payloads are emitted"],
    },
    {
      agentId: "crypto_exploit_intel_analyst",
      scope: "Maps public crypto exploit incidents to protocol controls, actor patterns, and buyer exposure.",
      allowedTools: ["public incident metadata", "chain analytics summaries", "onchain aggregate links", "protocol docs"],
      blockedTools: ["wallet signing", "fund tracing claims without evidence", "private address disclosure"],
      successCriteria: ["root cause is normalized", "buyer action is defensive", "wallet data is minimized"],
    },
    ...(includeComplianceProofs
      ? [
          {
            agentId: "compliance_proof_writer",
            scope: "Converts private KYT/sanctions checks into public-safe commitments.",
            allowedTools: ["OFAC list metadata", "private KYT adapter output", "hashing and signing utilities"],
            blockedTools: ["raw address publication", "permanent clearance claims", "vendor payload resale"],
            successCriteria: ["proof has expiry", "private and public fields are split", "raw vendor response is not exposed"],
          },
        ]
      : []),
    {
      agentId: "safe_proof_planner",
      scope: "Summarizes how a finding can be validated in an authorized sandbox without publishing weaponizable details.",
      allowedTools: ["test status", "sanitizer output summary", "patch diff summary"],
      blockedTools: ["step-by-step exploitation", "live target interaction", "payload disclosure"],
      successCriteria: ["proof is reproducible by authorized maintainers", "public output is non-weaponizing", "patch status is explicit"],
    },
    {
      agentId: "client_report_writer",
      scope: "Turns validated findings into buyer-readable JSON/HTML packets and tickets.",
      allowedTools: ["validated finding set", "source links", "output policy checker"],
      blockedTools: ["alarmist claims", "unreviewed critical labels", "external sends"],
      successCriteria: ["next actions are actionable", "confidence and caveats are visible", "human review gates are named"],
    },
  ];
}
