package aws

import (
	"bytes"
	"io"
	"io/ioutil"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/credentials/ec2rolecreds"
	"github.com/aws/aws-sdk-go/aws/ec2metadata"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
	"github.com/qor/media_library"
)

// S3 a struct used to upload files to S3
type S3 struct {
	media_library.Base
}

var client *s3.S3

// required
var awsRegion = os.Getenv("QOR_AWS_REGION")

// required
var awsAccessKeyID = os.Getenv("QOR_AWS_ACCESS_KEY_ID")

// required
var awsSecretAccessKey = os.Getenv("QOR_AWS_SECRET_ACCESS_KEY")

// required
// S3Bucket

// option
var awsSessionToken = os.Getenv("QOR_AWS_SESSION_TOKEN")

func s3client() *s3.S3 {
	if client == nil {
		var creds *credentials.Credentials
		if awsAccessKeyID == "" && awsSecretAccessKey == "" {
			client = s3.New(session.New(), EC2RoleAwsConfig())
		} else {
			creds = credentials.NewStaticCredentials(awsAccessKeyID, awsSecretAccessKey, awsSessionToken)
			if _, err := creds.Get(); err == nil {
				client = s3.New(session.New(), &aws.Config{
					Region:      &awsRegion,
					Credentials: creds,
				})
			}
		}
	}
	return client
}

func EC2RoleAwsConfig() *aws.Config {
	ec2m := ec2metadata.New(session.New(), &aws.Config{
		HTTPClient: &http.Client{Timeout: 10 * time.Second},
		Endpoint:   aws.String("http://169.254.169.254/latest"),
	})
	cr := credentials.NewCredentials(&ec2rolecreds.EC2RoleProvider{
		Client: ec2m,
	})

	return &aws.Config{
		Region:      &awsRegion,
		Credentials: cr,
	}
}

func getBucket(option *media_library.Option) string {
	if bucket := os.Getenv("S3Bucket"); bucket != "" {
		return bucket
	}
	return option.Get("bucket")
}

func getEndpoint(option *media_library.Option) string {
	if endpoint := option.Get("endpoint"); endpoint != "" {
		return endpoint
	}

	endpoint := s3client().Endpoint
	for _, prefix := range []string{"https://", "http://"} {
		endpoint = strings.TrimPrefix(endpoint, prefix)
	}

	return getBucket(option) + "." + endpoint
}

// GetURLTemplate get url template
func (s S3) GetURLTemplate(option *media_library.Option) (path string) {
	if path = option.Get("URL"); path == "" {
		path = "/{{class}}/{{primary_key}}/{{column}}/{{filename_with_hash}}"
	}

	return "//" + getEndpoint(option) + path
}

// Store store reader's content with url
func (s S3) Store(url string, option *media_library.Option, reader io.Reader) error {
	buffer, err := ioutil.ReadAll(reader)

	if err != nil {
		return err
	}

	fileBytes := bytes.NewReader(buffer)
	fileBytesLen := int64(fileBytes.Len())

	// Retrieve the file path from the file URL.
	//
	// As the `url` is the result of media_library.Base.URL(),
	// it may contains HTTP scheme, we should try to trim all
	// possible schemes in order to get actual file path.
	//
	// For example `https://www.google.com/images/file.png` to `/images/file.png`.
	filePath := url
	for _, scheme := range []string{"https://", "http://", "//"} {
		filePath = strings.TrimPrefix(filePath, scheme+getEndpoint(option))
	}

	fileType := mime.TypeByExtension(path.Ext(filePath))
	if fileType == "" {
		fileType = http.DetectContentType(buffer)
	}

	params := &s3.PutObjectInput{
		Bucket:        aws.String(getBucket(option)), // required
		Key:           aws.String(filePath),          // required
		ACL:           aws.String("public-read"),
		Body:          fileBytes,
		ContentLength: &fileBytesLen,
		ContentType:   aws.String(fileType),
		Metadata: map[string]*string{
			"Key": aws.String("MetadataValue"), //required
		},
	}

	_, err = s3client().PutObject(params)
	return err
}

// Retrieve retrieve file content with url
func (s S3) Retrieve(url string) (file *os.File, err error) {
	response, err := http.Get("http:" + url)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if file, err = ioutil.TempFile("/tmp", "s3"); err == nil {
		_, err := io.Copy(file, response.Body)
		return file, err
	}
	return nil, err
}
