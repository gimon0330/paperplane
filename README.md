ㅎㅇ
심심해서 만든 개똥겜임 하지마셈
https://gimon0330.github.io/paperplane/

## Ranking DB setup

지금 랭킹 UI와 Firebase 연결 어댑터는 준비되어 있음.

1. Firebase Console에서 프로젝트 생성
2. Firestore Database 생성
3. Web App 추가
4. `src/leaderboard.js`의 `firebaseConfig` 값 채우기
5. Firestore collection 이름은 `scores`

저장 데이터 형태:

```js
{
  nickname: "pilot",
  distance: 123.4,
  createdAt: serverTimestamp()
}
```

개발 중 임시 Firestore Rules 예시:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scores/{scoreId} {
      allow read: if true;
      allow create: if request.resource.data.nickname is string
        && request.resource.data.nickname.size() <= 16
        && request.resource.data.distance is number
        && request.resource.data.distance >= 0
        && request.resource.data.distance <= 1000;
      allow update, delete: if false;
    }
  }
}
```

공개 웹에서 쓰는 규칙이라 나중에는 App Check나 서버 검증을 붙이는 게 좋음.
