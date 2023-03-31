import { FlowDisplayColumn } from "flow-component-model";
import React, { CSSProperties } from "react";
import TreeDataGrid from "./TreeDataGrid";
import "./TreeDataGridHeaders.css"

export class TreeDataGridHeaders extends React.Component<any,any> {
    constructor(props: any) {
        super(props);
        this.state = {expanded: true}
    }

    render() {
        let tdg: TreeDataGrid = this.props.tdg;
        let cols: any[] = [];
        let gridCols: FlowDisplayColumn[] = tdg.data.dataGridColumns;
        let treeStyle: CSSProperties = {};
        treeStyle.width=tdg.state.treeWidthPercent + "%";
        let scroller: HTMLDivElement =  tdg.scroller;
        let cellStyle: CSSProperties = {};
        cellStyle.width = ((100 - tdg.state.treeWidthPercent) / gridCols.length) + "%";

        // add the tree column
        cols.push(
            <div
                className="tdgh-head tdgh-head-tree"
                style={treeStyle}
            >
                {tdg.model.label}
            </div>
        );
                
        tdg.data.dataGridColumns?.forEach((col: FlowDisplayColumn) => {
            if(col.visible) {
                cols.push(
                    <div
                        className="tdgh-head"
                        style={cellStyle}
                    >
                        <span
                            className="tdgh-head-value"
                        >
                            {col.label || col.developerName}
                        </span>
                    </div>
                );
            }
        });

        return (
            <div
                className="tdgh"
            >
                <div
                    className="tdgh-heads"
                >
                    {cols}
                </div>
            </div>
        );
    }
}