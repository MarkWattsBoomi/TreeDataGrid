import { FlowDisplayColumn } from "flow-component-model";
import { oData, oDataConfig } from "./oData";
import { oDataRow } from "./oDataRow";

// this is the simple representation of a tree node
export class oDataTreeNode {
    // unique id
    id: string;

    // child elements
    tree: Map<string,string>;

    // ref to the node's parent
    parent: oData | oDataTreeNode;

    // the label of the node
    label: string;

    // the child row key
    dataRowId: string;

    //flag to say it carries data
    carriesData: boolean;

    //the row's key, part of the dataRowId
    dataRowKey: string

    constructor(label: string, parent: oData | oDataTreeNode) {
        this.tree = new Map();
        this.id = crypto.randomUUID();
        this.label = label;
        this.parent = parent;
        this.dataRowId = "";
    }

    getRollupRow(tree: Map<string,oDataTreeNode>,rows: Map<string,oDataRow>,cols: FlowDisplayColumn[]) : oDataRow {
        let row: oDataRow = new oDataRow();
        this.tree.forEach((child: string) => {
            let node: oDataTreeNode = tree.get(child);
            let childRow: oDataRow = node.getRollupRow(tree, rows, cols);
            cols.forEach((col: FlowDisplayColumn) => {
                if(!row.cols.has(col.developerName)) {
                    row.cols.set(col.developerName,childRow.cols.get(col.developerName));
                }
                else {
                    let val: number = row.cols.get(col.developerName) as number;
                    val += childRow.cols.get(col.developerName);
                    row.cols.set(col.developerName,val);
                }
            })
        });
        if(this.dataRowId && this.carriesData){
            let tRow: oDataRow = rows.get(this.dataRowId);
            cols.forEach((col: FlowDisplayColumn) => {
                if(!row.cols.has(col.developerName)) {
                    row.cols.set(col.developerName,tRow.cols.get(col.developerName));
                }
                else {
                    let val: number = row.cols.get(col.developerName) as number;
                    val += tRow.cols.get(col.developerName);
                    row.cols.set(col.developerName,val);
                }
            });
        }
        
        return row;
    }
}