//
//  CommandController.m
//  ReactExample
//
//  Created by Vincent on 2016/11/18.
//  Copyright © 2016年 Facebook. All rights reserved.
//

#import "CommandController.h"
#import "CommandTable.h"

#import "RCTBundleURLProvider.h"
#import "RCTRootView.h"

#import "ReactViewController.h"

#import "RCTBridge+Private.h"

@interface CommandController ()  {
  
  CommandTable *  _commandTable;
}

@end

@implementation CommandController

- (void)viewDidLoad {
  [super viewDidLoad];
  // Do any additional setup after loading the view.
  _commandTable = [CommandTable tableWithController:self style:UITableViewStyleGrouped];
  
  [_commandTable.commands addObjectsFromArray:
   @[
     [Command commandWithName:@"Seperated Bridge" subtitle:@"seperated bridge" accessoryType:UITableViewCellAccessoryDisclosureIndicator block:^(UIViewController *controller) {
    
    
    NSURL *jsCodeLocation = [NSURL fileURLWithPath:[[NSBundle mainBundle] pathForResource:@"./build/seperatedbridge.ios" ofType:@"jsbundle"]];
    
//    jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index.ios" fallbackResource:nil];
//    
    ReactViewController *vc = [[ReactViewController alloc]  
                               initWithBundleURL:jsCodeLocation
                               initialProperties:nil
                               launchOptions:nil];
    vc.view.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];
    [self.navigationController pushViewController:vc animated:YES];
    
    
  }],[Command commandWithName:@"CommonBridge 1" subtitle:@"common bridge" accessoryType:UITableViewCellAccessoryDisclosureIndicator block:^(UIViewController *controller) {
    
    
    NSURL *jsCodeLocation = [NSURL fileURLWithPath:[[NSBundle mainBundle] pathForResource:@"./build/commonbridge1.ios" ofType:@"jsbundle"]];
    
    ReactViewController *vc = [[ReactViewController alloc] initWithBundleURL:jsCodeLocation initialProperties:nil launchOptions:nil useCommonBridge:YES];
    vc.view.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];
    [vc loadBusinessBundle];
    [self.navigationController pushViewController:vc animated:YES];
    
    
  }],[Command commandWithName:@"CommonBridge 2" subtitle:@"common bridge" accessoryType:UITableViewCellAccessoryDisclosureIndicator block:^(UIViewController *controller) {
    
    
    NSURL *jsCodeLocation = [NSURL fileURLWithPath:[[NSBundle mainBundle] pathForResource:@"./build/commonbridge2.ios" ofType:@"jsbundle"]];
    
    
    ReactViewController *vc = [[ReactViewController alloc] initWithBundleURL:jsCodeLocation initialProperties:nil launchOptions:nil useCommonBridge:YES];
    vc.view.backgroundColor = [[UIColor alloc] initWithRed:1.0f green:1.0f blue:1.0f alpha:1];
    [vc loadBusinessBundle];
    [self.navigationController pushViewController:vc animated:YES];
    
    
  }]
     ]];
  
}

- (void)didReceiveMemoryWarning {
  [super didReceiveMemoryWarning];
  // Dispose of any resources that can be recreated.
}

- (void)viewWillAppear:(BOOL)animated
{
  [super viewWillAppear:animated];
  [self.navigationController setNavigationBarHidden:NO animated:animated];
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
