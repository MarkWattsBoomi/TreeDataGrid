import React, { CSSProperties } from 'react';
import { eLoadingState, FlowComponent, FlowField, FlowObjectData } from 'flow-component-model';
import './TreeDataGrid.css';
import { FCMModal, FCMContextMenu } from 'fcmkit';
import { oData, oDataConfig } from './DataModel/oData';
import { TreeDataGridRow } from './TreeDataGridRow';
import { TreeDataGridHeaders } from './TreeDataGridHeaders';
import { oDataRow } from './DataModel/oDataRow';
import { oDataTreeNode } from './DataModel/oDataTreeNode';

declare const manywho: any;

export default class TreeDataGrid extends FlowComponent {

   version: string='1.0.0';
   context: any;

   messageBox: FCMModal;
   contextMenu: FCMContextMenu;
   lastContent: any = (<div></div>);

   data: oData;

   scroller: HTMLDivElement;

   selectedCell: string;

   constructor(props: any) {
      super(props);
      this.flowMoved = this.flowMoved.bind(this);
      this.cellClicked = this.cellClicked.bind(this);
      let selectedCell: string = sessionStorage.getItem(this.componentId+":selectedCell") || "";
      this.state={treeWidthPercent: 30, selectedCell: selectedCell}
   }


   async flowMoved(xhr: any, request: any) {
      let me: any = this;
      if(xhr.invokeType==='FORWARD') {
         if(this.loadingState !== eLoadingState.ready){
            window.setImmediate(function() {me.flowMoved(xhr, request)});
         }
         else {
            this.loadDataModel();
         }
      }
   }

   async componentDidMount() {
      await super.componentDidMount();
      (manywho as any).eventManager.addDoneListener(this.flowMoved, this.componentId);
      this.loadDataModel();
   }

   async componentWillUnmount() {
      await super.componentWillUnmount();
      (manywho as any).eventManager.removeDoneListener(this.componentId);
   }

   async loadDataModel() {
      // prep the data parse config
      let conf: oDataConfig = new oDataConfig();
      conf.displayColumns = this.model.displayColumns;
      conf.lastTreeColumn = this.getAttribute("lastTreeColumn");
      conf.stringModelFieldName = this.getAttribute("stringModelFieldName");
      //if we were told the name of a field to get the data from in attribute "stringModelFieldName" then load it
      if(this.getAttribute("stringModelFieldName","").length > 0){
         let fld: FlowField = await this.loadValue(this.getAttribute("stringModelFieldName"));
         if(fld) {
            this.data = oData.parseString(fld.value as string,conf);
         }
      }
      else {
         this.data = oData.parseObjectDataArray(this.model.dataSource,conf);
      }
      let selectedCell: string = sessionStorage.getItem(this.componentId+":selectedCell") || "";
      this.setState({selectedCell: selectedCell});
   }

   async cellClicked(key: string, colName: string) {
      
      let rowKey: string = key + ":" + colName;
      sessionStorage.setItem(this.componentId+":selectedCell",rowKey);
      let stateTypeName: string = this.getAttribute("stateTypeName");
      if(stateTypeName) {
         let item: FlowObjectData = this.data.makeObjectData(key,stateTypeName);
         this.setStateValue(item);
      }
      else {
         console.log("Not stateTypeName attribute set, cannot save selected cell to Flow");
      }
      let outcomeName: string = this.getAttribute("onCellSelect");
      if(outcomeName && this.outcomes[outcomeName]) {
         this.triggerOutcome(outcomeName);
      }
      else {
         if(this.model.hasEvents) {
            manywho.engine.sync(this.flowKey);
         }
         else {
            this.setState({selectedCell: rowKey});
         }
      }
      
   }

   render() {
      if(this.loadingState !== eLoadingState.ready) {
         return this.lastContent;
      }
      //handle classes attribute and hidden and size
      let className: string = 'tdg ' + this.getAttribute('classes','');
      let style: CSSProperties = {};
      style.width='-webkit-fill-available';
      style.height='-webkit-fill-available';

      if(this.model.visible === false) {
         style.display = 'none';
      }
      if(this.model.width) {
         style.width=this.model.width + 'vw'
      }
      if(this.model.height) {
         style.height=this.model.height + 'vh'
      }
      
      let content: any[] = [];
      if(this.data){
         // build tree
         let isFirst: boolean = true;
         this.data.tree.forEach((nodeId: string) => {
            content.push(
               <TreeDataGridRow 
                  tdg={this}
                  nodeId={nodeId}
                  level={0}
                  expanded={isFirst}
               />
            );
            isFirst=false;
         });
      }

      this.lastContent = (
         <div
            className={className}
            style={style}
         >
            <FCMContextMenu
               ref={(element: FCMContextMenu) => {this.contextMenu = element}}
            />
            <FCMModal
               ref={(element: FCMModal) => {this.messageBox = element}}
            />
            
            <div
               className='tdg-scroller'
               ref={(element: HTMLDivElement) => {this.scroller=element}}
            >
               <TreeDataGridHeaders
               tdg={this}
            />
               <div
                  className='tdg-scroller-content'
               >
                  {content}
               </div>
            </div>
            
      </div>
      );
      return this.lastContent;
   }
}

manywho.component.register('TreeDataGrid', TreeDataGrid);
