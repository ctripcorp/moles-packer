//
//  CommandTable.h
//  Example
//
//  Created by Vincent on 16/11/1.
//  Copyright © 2016年 Vincent. All rights reserved.
//

#import <UIKit/UIKit.h>

@interface Command : NSObject

@property (nonatomic, strong) NSString                      *name;
@property (nonatomic, strong) NSString                      *subtitile;

@property (nonatomic, assign) UITableViewCellAccessoryType  accessoryType;

@property (nonatomic, copy) void(^block)(UIViewController *controller);

+ (instancetype)commandWithName:(NSString *)name
                       subtitle:(NSString *)subtitle
                  accessoryType:(UITableViewCellAccessoryType)accessoryType
                          block:(void(^)(UIViewController *controller))block;

- (instancetype)initWithName:(NSString *)name
                    subtitle:(NSString *)subtitle
               accessoryType:(UITableViewCellAccessoryType)accessoryType
                       block:(void(^)(UIViewController *controller))block;

- (void)executeWithViewController:(UIViewController *)controller;


@end


@interface CommandTable : NSObject

@property (nonatomic, strong) UITableView   *tableView;

@property (nonatomic, strong) NSMutableArray<Command *> *commands;

+ (instancetype)tableWithController:(UIViewController *)controller style:(UITableViewStyle)style;

- (void)reload;

@end
