import React, { CSSProperties } from 'react';
import { eContentType, eLoadingState, FlowComponent, FlowField, FlowObjectData, FlowObjectDataArray, FlowObjectDataProperty } from 'flow-component-model';
import './TreeDataGrid.css';
import { FCMModal, FCMContextMenu } from 'fcmkit';
import { oData, oDataConfig, oDataConfigFilter, oDataConfigFilters } from './DataModel/oData';
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

   rowElements: Map<string, TreeDataGridRow>;

   constructor(props: any) {
      super(props);
      this.flowMoved = this.flowMoved.bind(this);
      this.cellClicked = this.cellClicked.bind(this);
      this.setRowElement = this.setRowElement.bind(this);
      this.filterChanged = this.filterChanged.bind(this);
      this.rowElements = new Map();
      let selectedCell: string = sessionStorage.getItem(this.componentId+":selectedCell") || "";
      this.state={treeWidthPercent: 40, selectedCell: selectedCell}
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

   setRowElement(key: string, element: TreeDataGridRow) {
      if(element){
         this.rowElements.set(key,element);
      }
   }

   async loadDataModel() {
      // prep the data parse config
      let conf: oDataConfig = new oDataConfig();
      conf.displayColumns = this.model.displayColumns;
      conf.lastTreeColumn = this.getAttribute("lastTreeColumn");
      conf.stringModelFieldName = this.getAttribute("stringModelFieldName");
      conf.setFilterFields(this.getAttribute("filterFieldNames","SM"))
      let filterFieldName: string = this.getAttribute("filterFieldName");
      if(filterFieldName) {
         let filters: FlowField = await this.loadValue(filterFieldName);
         //debug simulation
         
         filters.value = new FlowObjectDataArray();
         let filter: FlowObjectData = FlowObjectData.newInstance("a");
         filter.addProperty(FlowObjectDataProperty.newInstance("developerName",eContentType.ContentString,"SM"));
         filter.addProperty(FlowObjectDataProperty.newInstance("value",eContentType.ContentString,"A1010"));
         filters.value.addItem(filter);
         
         if(filters && filters.value){
            conf.filters = new oDataConfigFilters(filters.value as FlowObjectDataArray)
         }
      }
      
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
         await this.setStateValue(item);
      }
      else {
         console.log("Not stateTypeName attribute set, cannot save selected cell to Flow");
      }
      let outcomeName: string = this.getAttribute("onCellSelect");
      if(outcomeName && this.outcomes[outcomeName]) {
         await this.triggerOutcome(outcomeName);
      }
      else {
         if(this.model.hasEvents) {
            manywho.engine.sync(this.flowKey);
         }
      }
      this.setState({selectedCell: rowKey});
   }

   filterChanged(e: any) {
      let filter: oDataConfigFilter = this.data.config.filters.filters.get(e.currentTarget.id);
      if(filter){
         filter.value = e.currentTarget.options[e.currentTarget.selectedIndex].value;
      }
      this.data.filterRows();
      this.forceUpdate();
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
      let filters: any[] = [];
      if(this.data){
         // build tree
         let isFirst: boolean = true;
         this.data.tree.forEach((nodeId: string) => {
            let node: oDataTreeNode = this.data.treeNodes.get(nodeId);
            let row: oDataRow = this.data.rows.get(node.dataRowId);
            if(node && (!node.carriesData || ( node.carriesData && row?.include))){
               content.push(
                  <TreeDataGridRow 
                     tdg={this}
                     nodeId={nodeId}
                     level={0}
                     expanded={isFirst}
                     key={node.dataRowKey}
                     ref={(element: TreeDataGridRow) => {this.setRowElement(node.dataRowKey, element)}}
                  />
               );
            }
            isFirst=false;
         });

         this.data.config.filterFields.forEach((values: any[], key: string) =>{
            let options: any[] = [];
            options.push(
               <option
                  className='tdg-filters-select-option'
                  value={""}
               >
                  {"Any"}
               </option>
            );
            values.forEach((val: any) => {
               options.push(
                  <option
                     className='tdg-filters-select-option'
                     value={val}
                     selected={this.data.config.filters.valMatches(key,val)}
                  >
                     {val}
                  </option>
               );
            });
            filters.push(
               <div
                  className='tdg-filter'
               >
                  <span
                     className='tdg-filter-label'
                  >
                     {key}
                  </span>
                  <select
                     className='tdg-filters-select'
                     onChange={this.filterChanged}
                     id={key}
                  >
                     {options}
                  </select>
               </div>
            );
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
               className='tdg-filters'
            >
               {filters}
            </div>
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
               <div style={{flexGrow:1}}/>
            </div>
            
      </div>
      );
      return this.lastContent;
   }
}

manywho.component.register('TreeDataGrid', TreeDataGrid);
