import { FlowDisplayColumn } from "flow-component-model";
import React, { CSSProperties } from "react";
import { oDataRow } from "./DataModel/oDataRow";
import { oDataTreeNode } from "./DataModel/oDataTreeNode";
import TreeDataGrid from "./TreeDataGrid";
import "./TreeDataGridRow.css"

export class TreeDataGridRow extends React.Component<any,any> {

    rowElements: Map<string, TreeDataGridRow> ;

    constructor(props: any) {
        super(props);
        this.toggleExpanded = this.toggleExpanded.bind(this);
        this.cellClick = this.cellClick.bind(this);
        this.setRowElement = this.setRowElement.bind(this);
        this.rowElements = new Map();
        this.state = {expanded: this.props.expanded || false}
    }

    componentDidMount(): void {
        this.setState({expanded: this.props.expanded || false});
    }

    setRowElement(key: string, element: TreeDataGridRow) {
        if(element){
            this.rowElements.set(key,element);
        }
    }

    toggleExpanded() {
        this.setState({expanded: !this.state.expanded})
    }

    cellClick(key: string, colName: string) {
        let tdg: TreeDataGrid = this.props.tdg;
        let treeNode: oDataTreeNode = tdg.data.treeNodes.get(this.props.nodeId);
        tdg.cellClicked(treeNode.dataRowKey, colName);
    }

    render() {
        let tdg: TreeDataGrid = this.props.tdg;
        let treeNode: oDataTreeNode = tdg.data.treeNodes.get(this.props.nodeId);
        let children: any[] = [];
        let cols: any[] = [];
        let gridCols: FlowDisplayColumn[] = tdg.data.dataGridColumns;
        let treeStyle: CSSProperties = {};
        treeStyle.width=tdg.state.treeWidthPercent + "%";
        treeStyle.paddingLeft = this.props.level + "rem"
        let cellStyle: CSSProperties = {};
        cellStyle.width = ((100 - tdg.state.treeWidthPercent) / gridCols.length) + "%";

        // add the tree column
        let expander: any;
        if(treeNode.tree?.size > 0) {
            if(this.state.expanded){
                expander=(
                    <span 
                        className="tdgr-expander tdgr-expander-expanded glyphicon glyphicon-play"
                        onClick={this.toggleExpanded}
                    />
                )
            }
            else {
                expander=(
                    <span 
                        className="tdgr-expander glyphicon glyphicon-play"
                        onClick={this.toggleExpanded}
                    />
                )
            }
        }
        else {
            expander=(
                <span className="tdgr-expander"/>
            );
        }

        
        cols.push(
            <div
                className="tdgr-cell tdgr-cell-tree"
                style={treeStyle}
            >
                {expander}
                <span
                    className="tdgr-cell-tree-label"
                >
                    {treeNode.label}
                </span>
            </div>
        );

        let dataRow: oDataRow;
        //if this is expanded then get the actual data row, otherwise get the rollup row.
        if(this.state.expanded) {
            dataRow = tdg.data.getSummaryRow(treeNode.dataRowKey);
        }
        else {
            dataRow = tdg.data.getRollupRow(treeNode.id);
        }

        // are there any child nodes?  if so is this node expanded then add in children
        if(treeNode.tree?.size > 0) {
            //if(this.state.expanded) {
                treeNode.tree.forEach((nodeId: string) => {
                    let node: oDataTreeNode = tdg.data.treeNodes.get(nodeId);
                    //let row: oDataRow = tdg.data.rows.get(node.dataRowId);
                    if(node){ //} && (!node.carriesData || ( node.carriesData && row?.include))){
                        children.push(
                            <TreeDataGridRow 
                                tdg={this.props.tdg}
                                parent={this}
                                nodeId={nodeId}
                                key={node.dataRowKey}
                                level={this.props.level+1}
                                expanded={this.props.expanded}
                                ref={(element: TreeDataGridRow) => {this.setRowElement(node.dataRowKey, element)}}
                            />
                        );
                    }
                });
            //}
        }
        
        

        tdg.data.dataGridColumns?.forEach((col: FlowDisplayColumn) => {
            if(col.visible){
                let val: any = "";
                let cellClass: string ="tdgr-cell-inner";
                let onClick: any;
                let key: string = treeNode.dataRowKey + ":" + col.developerName;
                if(this.props.level===2){ // this should restrict the cell activeness based on being the lvl 3 node
                    onClick=(e: any) =>{this.cellClick(treeNode.dataRowId,col.developerName)};
                    cellClass += " tdgr-cell-inner-active";
                    if(tdg.state.selectedCell === key) {
                        cellClass += " tdgr-cell-inner-selected"
                    }
                }
                if(dataRow && (treeNode.carriesData || this.state.expanded===false)){
                    val = dataRow.all.get(col.developerName);
                }
                cols.push(
                    <div
                        className="tdgr-cell tdgr-cell-data"
                        style={cellStyle}
                        onClick={onClick}
                    >
                        <div
                            className={cellClass}
                        >
                            <span
                                className="tdgr-cell-value"
                            >
                                {val}
                            </span>
                        </div>
                    </div>
                );
            }
        });
        

        let childrenStyle: CSSProperties = {};
        if(this.state.expanded===false) {
            childrenStyle.display="none";
        }
        return (
            <div
                className="tdgr"
                key={treeNode.dataRowKey}
            >
                <div
                    className="tdgr-cells"
                >
                    {cols}
                </div>
                <div
                    className="tdgr-children"
                    style={childrenStyle}
                >
                    {children}
                </div>
            </div>
            
        );
    }
}