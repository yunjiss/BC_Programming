# 4th Task - Kairos 네트워크 배포 컨트랙트 UI 연동

TinyBank / MyToken 컨트랙트를 Kaia Kairos 테스트넷에 배포하고 [TinyBank UI](https://tinybank.vercel.app/)와 연동합니다.

## 배포 주소 (Kairos, chainId 1001)

| Contract | Address |
| --- | --- |
| MyToken  | `0xE568c14c074524226ad60FE6f8edAA6C07572B75` |
| TinyBank | `0x8EbF8B0e8e0fb98AaC62b9a30748b24b724B5F33` |

배포 기록: `ignition/deployments/chain-1001/`

## 변경 사항

- `MyToken.sol`: `faucet(uint256 amount)` 추가. 누구나 테스트 토큰을 받을 수 있습니다.
- `TinyBank.sol`
  - `currentReward(address to)` view 함수 추가 (UI의 Reward 표시용)
  - UI ABI에 맞춰 단일 매니저(`ManagedAccess`) 구조로 변경했습니다. 생성자는 `constructor(IMyToken)`입니다.
  - UI가 `stakingToken()`을 호출하므로 변수명을 `stakingtoken` → `stakingToken`으로 수정했습니다.
- `ignition/modules/deploy.ts`: MyToken과 TinyBank를 배포한 뒤 `setManager(TinyBank)`를 호출합니다.

## 테스트

```shell
npm install
npx hardhat test
```

- MyToken: faucet 발급 및 totalSupply 증가
- TinyBank: 스테이킹, 출금, 보상, 권한 검사, `currentReward` (미스테이킹 0 / 블록당 누적 / 지분 비율 분배 / 실제 지급액과 일치)
- Deploy: ignition 모듈로 배포했을 때 manager 연결 확인, UI 흐름(faucet → approve → stake → currentReward)

## Kairos 배포

```shell
npx hardhat vars set KAIROS_PRIVATE_KEY   # 개인키는 로컬에만 저장되고 저장소에는 올라가지 않음
npx hardhat ignition deploy ./ignition/modules/deploy.ts --network kairos
```
