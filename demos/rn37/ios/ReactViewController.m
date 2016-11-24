//
//  ReactViewController.m
//  ReactExample
//
//  Created by Vincent on 2016/11/18.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#import "ReactViewController.h"

#import "RCTBridge+Private.h"
#import <objc/runtime.h>
#import "RCTBridge.h"
#import "RCTUtils.h"
typedef void (^RCTJavaScriptCompleteBlock)(NSError *error);

@interface RCTBridge ( Moles )

@property (nonatomic, readwrite) NSURL* secondaryBundleURL;

- (void)loadSecondary;

- (void)enqueueApplicationScript:(NSData *)script
                             url:(NSURL *)url
                      onComplete:(RCTJavaScriptCompleteBlock)onComplete;

@end

@interface RCTRootView ( Moles )

- (instancetype)initWithPrimaryURL:(NSURL *)primaryURL
                      secondaryURL:(NSURL *)secondaryURL
                       moduleName:(NSString *)moduleName
                initialProperties:(NSDictionary *)initialProperties
                    launchOptions:(NSDictionary *)launchOptions;

@end



@interface ReactViewController () {
  
}

@end


static RCTBridge *commonBridge = NULL;

@implementation ReactViewController

+ (NSString *)moduleName
{
  return @"MOLES";
}

+ (NSURL *)commonJSURL
{
  return [NSURL fileURLWithPath:[[NSBundle mainBundle] pathForResource:@"./build/moles.common/common.ios" ofType:@"jsbundle"]];
}

- (instancetype)initWithBundleURL:(NSURL *)bundleURL
                initialProperties:(NSDictionary *)initialProperties
                    launchOptions:(NSDictionary *)launchOptions
{
  
  if (self = [super init]) {
    
    RCTRootView *rootView = [[RCTRootView alloc] initWithPrimaryURL:[[self class] commonJSURL] secondaryURL:bundleURL moduleName:[[self class] moduleName] initialProperties:initialProperties launchOptions:launchOptions];
    self.view  = rootView;
    [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(loadBusinessBundle) name:RCTJavaScriptDidLoadNotification object:nil];
		
  }
  return self;
}

- (instancetype)initWithBundleURL:(NSURL *)bundleURL
                initialProperties:(NSDictionary *)initialProperties
                    launchOptions:(NSDictionary *)launchOptions
                  useCommonBridge:(BOOL)useCommonBridge
{
  if (!useCommonBridge) {
    return [self initWithBundleURL:bundleURL initialProperties:initialProperties launchOptions:launchOptions];
  }
  if (self = [super init]) {
    RCTRootView *rootView;
    if (!commonBridge) {
      rootView = [[RCTRootView alloc] initWithBundleURL:[[self class] commonJSURL] moduleName:[[self class] moduleName] initialProperties:initialProperties launchOptions:launchOptions];
      commonBridge = rootView.bridge;
    } else {
      rootView = [[RCTRootView alloc] initWithBridge:commonBridge moduleName:[[self class] moduleName] initialProperties:initialProperties];
    }
    rootView.bridge.secondaryBundleURL = bundleURL;
    self.view  = rootView;
    
  }
  return self;
}

- (void)loadBusinessBundle
{
  RCTBridge *bridge = [(RCTRootView *)self.view bridge];
  [bridge loadSecondary];
}

- (void)dealloc
{
  [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (RCTRootView *)rootView
{
  return (RCTRootView *)self.view;
}


- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}

- (void)didReceiveMemoryWarning {
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

- (void)viewWillAppear:(BOOL)animated
{
  [super viewWillAppear:animated];
//  [self.navigationController setNavigationBarHidden:YES animated:animated];
  
}


/*
#pragma mark - Navigation

// In a storyboard-based application, you will often want to do a little preparation before navigation
- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    // Get the new view controller using [segue destinationViewController].
    // Pass the selected object to the new view controller.
}
*/

@end


static const void *RCTBridgeSecondaryURLKey = &RCTBridgeSecondaryURLKey;

@interface RCTBatchedBridge (Private)


@end


@implementation RCTBridge (Moles)


-(NSURL *)secondaryBundleURL {
  id value = objc_getAssociatedObject(self, RCTBridgeSecondaryURLKey);
  return value;
}

- (void)setSecondaryBundleURL:(NSURL *)SecondaryBundleURL {
  objc_setAssociatedObject(self, RCTBridgeSecondaryURLKey, SecondaryBundleURL, OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (void)loadSecondary
{
  NSURL *secondaryURL = self.secondaryBundleURL;
  if (!secondaryURL) {
    return;
  }
//  return;
  dispatch_queue_t bridgeQueue = dispatch_queue_create("moles.bussiness.RCTBridgeQueue", DISPATCH_QUEUE_CONCURRENT);
  dispatch_group_t initModulesAndLoadSource = dispatch_group_create();
  dispatch_group_enter(initModulesAndLoadSource);
  __weak RCTBatchedBridge *batchedBridge = (RCTBatchedBridge *)[self batchedBridge];
  __block NSData* sourceCode;
  [RCTJavaScriptLoader loadBundleAtURL:secondaryURL onProgress:nil onComplete:^(NSError *error, NSData *source, int64_t sourceLength) {
    
    sourceCode = source;
    dispatch_group_leave(initModulesAndLoadSource);
  }];
  
  dispatch_group_notify(initModulesAndLoadSource, bridgeQueue, ^{
    RCTBatchedBridge *strongBridge = batchedBridge;
    if (sourceCode) {
      while (strongBridge.isLoading) {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode beforeDate:[NSDate distantFuture]];
      }
      [strongBridge enqueueApplicationScript:sourceCode url:secondaryURL onComplete:^(NSError *error) {
//        NSLog(@"%@",error);
//        NSLog(@"%@", [[NSString alloc] initWithData:sourceCode encoding:NSUTF8StringEncoding]);
      }];
    }
  });
}


@end


@implementation RCTRootView (Moles)

- (instancetype)initWithPrimaryURL:(NSURL *)primaryURL
                      secondaryURL:(NSURL *)secondaryURL
                        moduleName:(NSString *)moduleName
                 initialProperties:(NSDictionary *)initialProperties
                     launchOptions:(NSDictionary *)launchOptions
{
  RCTBridge *bridge = [[RCTBridge alloc] initWithBundleURL:primaryURL
                                            moduleProvider:nil
                                             launchOptions:launchOptions];
  bridge.secondaryBundleURL = secondaryURL;
  
  return [self initWithBridge:bridge moduleName:moduleName initialProperties:initialProperties];
}

@end

//
//
//@implementation RCTBatchedBridge ( Moles )
//
//+ (void)load
//{
//  SEL origSel = @selector(start);
//  SEL swizSel = @selector(moles_start);
//  
//  Class class = [RCTBatchedBridge class];
//  
//  Method origMethod = class_getInstanceMethod(class, origSel);
//  Method swizMethod = class_getInstanceMethod(class, swizSel);
//  
//  //class_addMethod will fail if original method already exists
//  BOOL didAddMethod = class_addMethod(class, origSel, method_getImplementation(swizMethod), method_getTypeEncoding(swizMethod));
//  
//  if (didAddMethod) {
//    class_replaceMethod(class, swizSel, method_getImplementation(origMethod), method_getTypeEncoding(origMethod));
//  } else {
//    //origMethod and swizMethod already exist
//    method_exchangeImplementations(origMethod, swizMethod);
//  }
//
//}
//
//
//- (void)moles_start
//{
//  [self moles_start];
//  
//}
//
//
//@end
//
//




