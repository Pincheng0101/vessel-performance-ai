from aws_cdk import (
    CfnOutput,
    RemovalPolicy,
    Stack,
    aws_cloudfront,
    aws_cloudfront_origins,
    aws_s3,
)
from constructs import Construct
from pyhocon import ConfigTree


class YmDatalakeUiStack(Stack):
    """Static hosting for the ym-datalake-ui Nuxt SPA: a private S3 bucket fronted
    by CloudFront (OAC). This stack only provisions the infrastructure; the built
    site (`nuxt generate` → `.output/public`) is uploaded separately via
    `aws s3 sync` or CI. The default *.cloudfront.net domain/cert is used."""

    def __init__(self, scope: Construct, construct_id: str, conf: ConfigTree, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Origin bucket — kept fully private; only CloudFront (via OAC) reads it.
        #    POC: auto-cleaned on stack destroy.
        bucket = aws_s3.Bucket(
            self,
            'UiBucket',
            block_public_access=aws_s3.BlockPublicAccess.BLOCK_ALL,
            encryption=aws_s3.BucketEncryption.S3_MANAGED,
            enforce_ssl=True,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )

        # 2. CloudFront distribution — OAC origin, HTTPS-only. SPA client-side routing
        #    means unknown paths must fall back to index.html with a 200.
        distribution = aws_cloudfront.Distribution(
            self,
            'UiDistribution',
            comment='ym-datalake-ui',
            default_root_object='index.html',
            default_behavior=aws_cloudfront.BehaviorOptions(
                origin=aws_cloudfront_origins.S3BucketOrigin.with_origin_access_control(bucket),
                viewer_protocol_policy=aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cache_policy=aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
            ),
            error_responses=[
                aws_cloudfront.ErrorResponse(
                    http_status=403,
                    response_http_status=200,
                    response_page_path='/index.html',
                ),
                aws_cloudfront.ErrorResponse(
                    http_status=404,
                    response_http_status=200,
                    response_page_path='/index.html',
                ),
            ],
        )

        # 3. Outputs — bucket name for `aws s3 sync`, distribution id for cache
        #    invalidation, and the public URL.
        CfnOutput(self, 'UiBucketName', value=bucket.bucket_name)
        CfnOutput(self, 'UiDistributionId', value=distribution.distribution_id)
        CfnOutput(self, 'UiDistributionDomainName', value=distribution.distribution_domain_name)
        CfnOutput(self, 'UiUrl', value=f'https://{distribution.distribution_domain_name}')
