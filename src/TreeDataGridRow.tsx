import { FlowDisplayColumn } from "flow-component-model";
import React, { CSSProperties } from "react";
import { oDataRow } from "./DataModel/oDataRow";
import { oDataTreeNode } from "./DataModel/oDataTreeNode";
import TreeDataGrid from "./TreeDataGrid";
import "./TreeDataGridRow.css"

export class TreeDataGridRow extends React.Component<any,any> {
    constructor(props: any) {
        super(props);
        this.toggleExpanded = this.toggleExpanded.bind(this);
        this.cellClick = this.cellClick.bind(this);
        this.state = {expanded: this.props.expanded || false}
    }

    toggleExpanded() {
        this.setState({expanded: !this.state.expanded})
    }

    cellClick(key: string, colName: string) {
        let tdg: TreeDataGrid = this.props.tdg;
        let treeNode: oDataTreeNode = tdg.data.treeNodes.get(this.props.nodeId);
        let dataRow: oDataRow = tdg.data.rows.get(treeNode.dataRowId);
        tdg.cellClicked(key, colName);
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

        // are there any child nodes?  if so is this node expanded then add in children
        if(treeNode.tree?.size > 0) {
            if(this.state.expanded) {
                treeNode.tree.forEach((nodeId: string) => {
                    children.push(
                        <TreeDataGridRow 
                            tdg={this.props.tdg}
                            parent={this}
                            nodeId={nodeId}
                            level={this.props.level+1}
                            expanded={this.props.expanded}
                        />
                    );
                });
            }
        }
        
        let dataRow: oDataRow;

        //if this is expanded then get the actual data row, otherwise get the rollup row.
        if(this.state.expanded) {
            dataRow = tdg.data.rows.get(treeNode.dataRowId);
        }
        else {
            dataRow = tdg.data.getRollupRow(treeNode.id);
        }

        tdg.data.dataGridColumns?.forEach((col: FlowDisplayColumn) => {
            let val: any = "";
            let cellClass: string ="tdgr-cell-inner";
            let onClick: any;
            let key: string = treeNode.dataRowId + ":" + col.developerName;
            if(this.props.level===2){ // this should restrict the cell activeness based on being the lvl 3 node
                onClick=(e: any) =>{this.cellClick(treeNode.dataRowId,col.developerName)};
                cellClass += " tdgr-cell-inner-active";
                if(tdg.state.selectedCell === key) {
                    cellClass += " tdgr-cell-inner-selected"
                }
            }
            if(dataRow && children.length===0){
                val = dataRow.cols.get(col.developerName);
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
        });

        return (
            <div
                className="tdgr"
            >
                <div
                    className="tdgr-cells"
                >
                    {cols}
                </div>
                <div
                    className="tdgr-children"
                >
                    {children}
                </div>
            </div>
            
        );
    }
}