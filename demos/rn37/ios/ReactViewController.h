//
//  ReactViewController.h
//  ReactExample
//
//  Created by Vincent on 2016/11/18.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#import <UIKit/UIKit.h>

#import "RCTBundleURLProvider.h"
#import "RCTRootView.h"

@interface ReactViewController : UIViewController



/**
 内置加载公共JS，并且在初始化后直接加在业务JS，Bridge独立。

 @param bundleURL 业务JSBundle
 @param initialProperties initialProperties
 @param launchOptions launchOptions
 @return ReactViewController Instances
 */
- (instancetype)initWithBundleURL:(NSURL *)bundleURL
                initialProperties:(NSDictionary *)initialProperties
                    launchOptions:(NSDictionary *)launchOptions;


/**
 内置加载公共JS, 允许设置是否使用公共Bridge。
 需要在页面显示时手工调 - (void)loadBusinessBundle 来加载业务JS

 @param bundleURL 业务JSBundle
 @param initialProperties initialProperties
 @param launchOptions launchOptions
 @param commonBridge commonBridge
 @return ReactViewController Instances
 */
- (instancetype)initWithBundleURL:(NSURL *)bundleURL
                initialProperties:(NSDictionary *)initialProperties
                    launchOptions:(NSDictionary *)launchOptions
                  useCommonBridge:(BOOL)commonBridge;

- (void)loadBusinessBundle;

- (RCTRootView *)rootView;


@end
