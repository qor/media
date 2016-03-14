## Media Library

Media Library is a [Golang](http://golang.org/) library that supports the upload of files/images to a filesystem or cloud storage. The Plugin includes cropping and resizing features for images.

[![GoDoc](https://godoc.org/github.com/qor/media_library?status.svg)](https://godoc.org/github.com/qor/media_library)

## Usage

Media Library is dependant on [GORM-backend](https://github.com/jinzhu/gorm) models as it is using GORM's callbacks to handle file processing, so you will need to register callbacks first:

```go
import "github.com/jinzhu/gorm"
import "github.com/qor/media_library"

DB, err = gorm.Open("sqlite3", "demo_db") // [gorm](https://github.com/jinzhu/gorm)

media_library.RegisterCallbacks(&DB)
```

Add Media Library support to structs:

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

And you're done setting up! You could the use it like this:

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

[QOR](http://getqor.com) is architected from the ground up to accelerate development and deployment of Content Management Systems, E-commerce Systems, and Business Applications and as such is comprised of modules that abstract common features for such systems.

Media Library could be used alone, but it works very nicely with QOR (as a QOR Plugin), if you have requirements to manage your application's data, be sure to check QOR out!

[QOR Demo:  http://demo.getqor.com/admin](http://demo.getqor.com/admin)

[Media Library Demo with QOR](http://demo.getqor.com/admin/products/1)

## License

Released under the [MIT License](http://opensource.org/licenses/MIT).
