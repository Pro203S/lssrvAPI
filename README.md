# SystemInformationAPI

현재 시스템의 정보를 불러올 수 있는 API입니다.

## 설치

1. 터미널을 엽니다.
2. ```git clone https://github.com/Pro203S/SystemInformationAPI```를 입력합니다.
3. ```npm i```를 입력합니다.
4. ```npm run start```를 입력합니다.

## config.env 설정

### PORT

기본값은 ```8080```입니다.  
유효 값은 1024부터 65535입니다.

### REQUIRED_PW

기본값은 ```no```입니다.  
값은 ```yes``` 또는 ```no```로 입력해야합니다.  
값이 ```yes```면 클라이언트는 ```AUTH_PW``` 값을 base64로 인코딩해 Authorization 헤더로 보내야 합니다.

### AUTH_PW

기본값은 ```password```입니다.  
비밀번호를 설정해도 ```REQUIRED_PW```의 값이 ```no```이면 비밀번호를 요구하지 않습니다.

### HEARTBEAT_INTERVAL

기본값은 ```15200```입니다.  
값은 숫자로 입력해야합니다.  
밀리초 단위입니다. (1초 = 1000밀리초)

## API 사용

### /

- 메서드: GET
- 헤더: Authorization (선택)
- 반환 값: [StaticInfo](#staticinfo)

만약 서버에 비밀번호가 있을경우, Authorization에 비밀번호를 base64로 인코딩해 보내야 합니다.  

|오류코드|설명|
|------|-------|
|401|비밀번호가 틀립니다.|
|500|내부 서버 오류입니다.|

## 웹소켓 사용

### 요청

- 경로: /socket
- 메서드: GET
- 쿼리 파라메터: pw (선택)

만약 서버에 비밀번호가 있을경우, pw에 비밀번호를 base64로 인코딩해 보내야 합니다.  

|오류코드|설명|
|------|-------|
|400|잘못된 경로입니다.|
|401|비밀번호가 틀립니다.|
|500|내부 서버 오류입니다.|

### Heartbeat

클라이언트는 일정 시간마다 서버에 ping을 보내야 합니다.  
처음 웹소켓에 접속하면 서버는 아래 타입의 값을 반환합니다.

```typescript
interface WebSocketResponse {
    type: "hello"
    heartbeatInterval: number;
}
```

클라이언트는 받은 ```heartbeatInterval```의 값마다 서버에 아래 타입의 값을 보내야 합니다.

```typescript
interface WebSocketSend {
    type: "heartbeat"
}
```

> 클라이언트는 ```heartbeatInterval```의 간격 안에 heartbeat를 한 번 초과해서 보낼 수 없습니다.  
> 클라이언트가 ```heartbeatInterval```의 간격 안에 heartbeat를 못 보냈을 시 1.5초간의 유예시간이 주어집니다.  
> 만약 유예시간이 지났다면 웹소켓이 닫힙니다.

### 연결되었을 때

처음 웹소켓에 접속하면 서버는 아래 타입의 값을 반환합니다.  
(```type```이 ```hello```인 반환 값은 [heartbeat](#heartbeat)에 있습니다)  

```typescript
interface WebSocketResponse {
    type: "static"
    info: StaticInfo
}
```

([StaticInfo](#staticinfo)의 타입은 아래 [타입 선언](#타입-선언) 문단에 있습니다)  

서버는 기본적으로 1초마다 현재 CPU 온도, CPU 사용량, 메모리 사용량, 네트워크 사용량을 [RealtimeInfo](#realtimeinfo)의 타입에 맞게 반환합니다.

### RealtimeInfo 간격 설정

서버에서 RealtimeInfo를 보낼 간격을 설정할 수 있습니다.  
서버에 아래의 타입에 맞게 값을 보내면 설정됩니다.

```typescript
interface WebSocketSend {
    type: "interval",
    interval: number
}
```

### 연결 종료

|오류코드|설명|
|------|------|
|1003|잘못된 데이터를 받았습니다.|
|1011|내부 서버 오류입니다.|
|4000|메시지를 참고해주세요.|

## 타입 선언

### StaticInfo

```typescript
interface StaticInfo {
    cpu: {
        manufacturer: string;
        brand: string;
        cores: number;
    };
    mem: number;
    os: {
        name: string;
        release: string;
        logoUri: string;
    };
}
```

### RealtimeInfo

```typescript
interface RealtimeInfo {
    cpu: {
        temp: number;
        speed: number;
    };
    ram: {
        total: number;
        used: number;
    };
    net: {
        down: {
            Bps: number;
            KBps: number;
            MBps: number;
        };
        up: {
            Bps: number;
            KBps: number;
            MBps: number;
        };
        sent: number;
        received: number;
    };
}
```
