# AOE 0G Hackathon Proof Packet

This directory is the static handoff for the AOE 0G proof lane. The live route is
the source of truth:

```bash
curl -fsS "$AOE_BASE_URL/v1/hackathon/0g-proof" | jq .
```

## Judge Fast Path

- Public workbench: `/`
- Demo guide: `/demo`
- 0G proof passport: `GET /v1/hackathon/0g-proof`
- Contract bundle: `GET /v1/contracts`
- Buyer proof: `GET /v1/buyer-proof`
- Payment posture: `GET /v1/x402/status`

## Public 0G Evidence

- 0guard proof page: `https://arigatoexpress.github.io/0guard/hackathon-0g/`
- 0guard mainnet proof JSON:
  `https://arigatoexpress.github.io/0guard/hackathon-0g/mainnet-proof.json`
- 0guard HackQuest proof JSON:
  `https://arigatoexpress.github.io/0guard/hackathon-0g/hackquest-submission-proof.json`
- 0G chain id: `16661`
- Contract:
  `0xBaC59b1571b7c7195915c5B36D8A719Ed7182abc`
- Anchor transaction:
  `0x64ff260ccd02aa69fc18d5727eb4530d8774003bc7df63ec7d5cda036fc438ed`

## Boundary

AOE reads an existing public receipt and packages the proof for buyers/judges.
It does not sign, broadcast, start a 0G node, post a new proof, move funds,
screen private subjects, publish raw wallet addresses, or claim sanctions
clearance.
