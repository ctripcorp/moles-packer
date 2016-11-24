//
//  CommandTable.m
//  Example
//
//  Created by Vincent on 16/11/1.
//  Copyright © 2016年 Vincent. All rights reserved.
//

#import "CommandTable.h"

@implementation Command

+ (instancetype)commandWithName:(NSString *)name
                       subtitle:(NSString *)subtitle
                  accessoryType:(UITableViewCellAccessoryType)accessoryType block:(void (^)(UIViewController *))block
{
    return [[self alloc] initWithName:name subtitle:subtitle accessoryType:accessoryType block:block];
    
}

- (instancetype)initWithName:(NSString *)name subtitle:(NSString *)subtitle accessoryType:(UITableViewCellAccessoryType)accessoryType block:(void (^)(UIViewController *))block
{
    if (self = [super init]) {
        self.name = name;
        self.accessoryType = accessoryType;
      self.subtitile = subtitle;
        self.block = block;
    }
    return self;
}

- (void)executeWithViewController:(UIViewController *)controller
{
    self.block(controller);
}


@end


@interface CommandTable () <UITableViewDelegate, UITableViewDataSource>

@property (nonatomic, weak) UIViewController    *controller;

@end

@implementation CommandTable

- (instancetype)init
{
    self = [super init];
    if (self) {
        _commands = [NSMutableArray new];
    }
    return self;
}

+ (instancetype)tableWithController:(UIViewController *)controller style:(UITableViewStyle)style
{
    CommandTable *table = [[self alloc] init];\
    
    UITableView *tableView = [[UITableView alloc] initWithFrame:CGRectZero style:style];
    tableView.delegate = table;
    tableView.dataSource = table;
    tableView.tableFooterView = [[UIView alloc] initWithFrame:CGRectZero];
    if (controller) {
        table.controller = controller;
        [controller.view addSubview:tableView];
        tableView.translatesAutoresizingMaskIntoConstraints = NO;
        [controller.view addConstraints:[NSLayoutConstraint
                                         constraintsWithVisualFormat:@"H:|-0-[t]-0-|"
                                         options:0
                                         metrics:@{}
                                         views:@{@"t":tableView}]];
        [controller.view addConstraints:[NSLayoutConstraint
                                         constraintsWithVisualFormat:@"V:|-0-[t]-0-|"
                                         options:0
                                         metrics:@{}
                                         views:@{@"t":tableView}]];
    }
    
    
    table.tableView = tableView;
    
    return table;
}

- (void)reload
{
    [_tableView reloadData];
}

#pragma mark - TableView data source
- (NSInteger)numberOfSectionsInTableView:(UITableView *)tableView
{
    return 1;
}

- (NSInteger)tableView:(UITableView *)tableView numberOfRowsInSection:(NSInteger)section
{
    return [self.commands count];
}

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath
{
    static NSString *CellIdentifier = @"CommandCell";
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:CellIdentifier];
    if (!cell) {
        cell = [[UITableViewCell alloc] initWithStyle:UITableViewCellStyleSubtitle reuseIdentifier:CellIdentifier];
    }
    
    Command *command = [self.commands objectAtIndex:indexPath.row];
    cell.textLabel.text = command.name;
    cell.detailTextLabel.text = command.subtitile;
    cell.accessoryType = command.accessoryType;
    
    return cell;
}

#pragma mark - TableView delegate

- (void)tableView:(UITableView *)tableView didSelectRowAtIndexPath:(NSIndexPath *)indexPath
{
    [[self.commands objectAtIndex:indexPath.row] executeWithViewController:self.controller];
    [tableView deselectRowAtIndexPath:indexPath animated:YES];
}

@end
