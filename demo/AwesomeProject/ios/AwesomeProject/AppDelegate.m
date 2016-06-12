/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

#import "AppDelegate.h"

#import "RCTRootView.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
 
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"moles" initialProperties:nil];
  
  self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
  UIViewController *rootViewController = [UIViewController new];
  rootViewController.view = rootView;
  self.window.rootViewController = rootViewController;
  [self.window makeKeyAndVisible];
  return YES;
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [[NSBundle mainBundle] URLForResource:@"build/bu" withExtension:@"jsbundle"];
}


- (void)loadSourceForBridge:(RCTBridge *)bridge
                  withBlock:(RCTSourceLoadBlock)loadCallback
{
  NSMutableData *data = [NSMutableData dataWithContentsOfURL:[[NSBundle mainBundle] URLForResource:@"build/common" withExtension:@"jsbundle"]];
  NSData *bridgedata = [NSData dataWithContentsOfURL:bridge.bundleURL];
  [data appendData:bridgedata];
  loadCallback(nil, data);
}

@end

