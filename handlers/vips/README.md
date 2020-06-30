# ENV

### dev env
```brew install vips```


### build Dockerfile
```
FROM alpine:3.12

RUN apk add --update go=1.13.11-r0 gcc=9.3.0-r2 g++=9.3.0-r2 git=2.26.2-r0

RUN apk add --update build-base vips-dev
```
### build command

set CGO_ENABLED=1, eg:
```
GOOS=linux CGO_ENABLED=1 GOARCH=amd64 go build -tags 'bindatafs' -a -o main main.go
```

### deploy Dockerfile

```
FROM alpine:3.12

RUN apk --update upgrade && \

    apk add ca-certificates && \
    
    apk add tzdata && \
    
    apk add build-base vips-dev && \
    
    rm -rf /var/cache/apk/*
```
 
# Usage

Setup media library and add below code, then it will compress jpg/png and generate webp for you.

```
import "github.com/qor/media/handlers/vips"

vips.UseVips(vips.Config{EnableGenerateWebp: true})
```

you can adjust image quality by config if you want.
```
type Config struct {
	EnableGenerateWebp bool
	PNGtoWebpQuality   int
	JPEGtoWebpQuality  int
	JPEGQuality        int
	PNGQuality         int
	PNGCompression     int
}
  ```  

