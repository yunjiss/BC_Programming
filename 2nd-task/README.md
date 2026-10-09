# 2nd Task - approve & transferFrom

signer1이 signer0의 MT 토큰을 옮기는 테스트케이스

1. **approve**: signer0이 signer1에게 10 MT 이동 권한 부여
2. **transferFrom**: signer1이 signer0의 7 MT를 자신의 주소(signer1)로 전송
3. **balance 확인**: signer0 = 93 MT, signer1 = 7 MT, 남은 허용량 = 3 MT

## 실행

```shell
cd 2nd-task
npm install
npx hardhat test
```
