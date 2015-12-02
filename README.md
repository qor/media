## Introduction

Media Library is a [Golang](http://golang.org/) library based on [GORM](https://github.com/jinzhu/gorm), it will add uploading files to cloud or other destinations with support for image cropping and resizing features to any structs.

It is easy to be extend to support any cloud storages, rightnow, it has filesystem, s3, aliyun, qiniu support.

## Usage

Media library is using [GORM](https://github.com/jinzhu/gorm)'s callbacks to process files, so you needs to register callbacks to gorm DB first, do it like:

```go
import "github.com/jinzhu/gorm"
import "github.com/qor/media_library"

DB, err = gorm.Open("sqlite3", "demo_db") // [gorm](https://github.com/jinzhu/gorm)

media_library.RegisterCallbacks(&DB)
```

Add supprots to structs

```go
// upload file to FileSystem
import "github.com/qor/media_library"

type Product struct {
	gorm.Model
	Image media_library.FileSystem
}

// Upload file to s3
import "github.com/qor/media_library/aws"

type Product struct {
	gorm.Model
	Image aws.S3
}
```

And you're done! you could use it like this:

```go
var product Product

if productImage, err := os.Open("product_image.png"); err == nil {
	product.Image.Scan(productImage)
}

DB.Save(&product)

// Get image's url, will be s3 url if it is uploaded to s3
product.Image.URL()
```

## Advanced Usage

```go
// Resize images into different sizes when saving images
type ProductIconImageStorage struct{
	media_library.FileSystem
}

func (ProductIconImageStorage) GetSizes() map[string]media_library.Size {
	return map[string]media_library.Size{
		"small":    {Width: 60 * 2, Height: 60 * 2},
		"small@ld": {Width: 60, Height: 60},

		"middle":    {Width: 108 * 2, Height: 108 * 2},
		"middle@ld": {Width: 108, Height: 108},

		"big":    {Width: 144 * 2, Height: 144 * 2},
		"big@ld": {Width: 144, Height: 144},
	}
}
```

## [Qor Support](https://github.com/qor/qor)

Media library could be used alone, and it could works nicely with qor, it you want a admin with CURD support, please check [it](https://github.com/qor/qor) out!
