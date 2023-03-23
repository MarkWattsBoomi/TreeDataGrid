import { FlowDisplayColumn, FlowObjectData, FlowObjectDataArray } from "flow-component-model";
import { oDataRow } from "./oDataRow";
import { oDataTreeNode } from "./oDataTreeNode";

// class to pass the data interpretation parameters to the underlying model
export class oDataConfig {
    // the last display column's developer name
    lastTreeColumn: string;
    
    // if the data is being delivered as a JSON string, this is the Flow value name containing it. 
    stringModelFieldName: string;

    // a copy of the component's configured display columns
    displayColumns: FlowDisplayColumn[];

    // a list of filters to apply to data
    filters: oDataConfigFilters;

    constructor() {
        this.filters = new oDataConfigFilters(null);
    }
}

export class oDataConfigFilters {
    // a list of filters to apply to data
    filters: oDataConfigFilter[];

    constructor(filters: FlowObjectDataArray) {
        this.filters = [];
        filters?.items?.forEach((item: FlowObjectData) => {
            this.filters.push(
                new oDataConfigFilter(
                    item.properties["developerName"].value as string,
                    item.properties["value"].value as string
                )
            );
        });
        //parse filters
    }

    rowMatches(row: oDataRow, colDefs: FlowDisplayColumn[]) : boolean {
        let matches: boolean = true;
        if(this.filters.length > 0) {
            this.filters.forEach((filter: oDataConfigFilter) => {
                if(filter.rowMatches(row, colDefs) === false) {
                    matches = false;
                }
            });
        }
        return matches;
    }
}

export class oDataConfigFilter {
    developerName: string;
    value: any;

    constructor(developerName: string, value: any) {
        this.developerName = developerName;
        this.value = value;
    }

    rowMatches(row: oDataRow, colDefs: FlowDisplayColumn[]) : boolean {
        let matches: boolean = true;
        let colDef: FlowDisplayColumn;

        // we want this so we can cast the val for comparing
        colDefs.forEach((def: FlowDisplayColumn)=>{
            if(def.developerName===this.developerName) {
                colDef=def;
            }
        });

        if(colDef) {
            let val: any = row.cols.get(colDef.developerName) || row.tree.get(colDef.developerName);
            if(this.value && this.value.length>0){
                if(val && val === this.value) {
                    matches = true;
                }
                else {
                    matches = false;
                }
            }
        }
        return matches;
    }
}

// this class represents the data model.  It has the methods to parse, query and present the data for rendering
export class oData {
    
    config: oDataConfig;

    //the hierarchical tree, contains the label and id of node in treeNodes
    tree: Map<string,string>;

    //flat map of all nodes
    treeNodes: Map<string,oDataTreeNode>;
    
    // every row of data keyed on row id
    rows: Map<string,oDataRow>;

    // unused but needed to overlap oDataTree
    dataRowId: string;
    carriesData: boolean;

    dataGridColumns: FlowDisplayColumn[];
    
    constructor(conf: oDataConfig) {
        this.config = conf;
        this.rows = new Map();
        this.tree = new Map();
        this.treeNodes = new Map();
        this.dataGridColumns = [];
        let inData: boolean = false;
        conf.displayColumns.forEach((col: FlowDisplayColumn) => {
            if(inData){
                this.dataGridColumns.push(col);
            }
            else {
                if(col.developerName===conf.lastTreeColumn) {
                    inData = true;
                }
            }
        });
    }

    public static parseString(data: string, conf: oDataConfig) : oData {
        let odata: oData = new oData(conf);
        let json: any[] = JSON.parse(data);
        if(json && json.length > 0){
            json.forEach((item: any) => {
                let row: oDataRow = oDataRow.parseObject(item, odata.config);
                odata.ingestRow(row);
            });
        }
        return odata;
    }

    public static parseObjectDataArray(data: FlowObjectDataArray, conf: oDataConfig) : oData {
        let odata: oData = new oData(conf);
        if(data && data.items.length > 0){
            data.items.forEach((item: FlowObjectData) => {
                let row: oDataRow = oDataRow.parseObjectData(item, odata.config);
                odata.ingestRow(row);
            });
        }
        return odata;
    }

    private ingestRow(row: oDataRow) {
        if(this.config.filters.rowMatches(row, this.config.displayColumns)) {
            this.rows.set(row.id, row);
            let node: oData | oDataTreeNode = this;
            let rowId: string="";
            row.tree.forEach((treeNode: string) => {
                if(rowId.length > 0) {
                    rowId += "^^";
                }
                rowId += treeNode;
                if(!node.tree.has(treeNode)){
                    let newNode : oDataTreeNode = new oDataTreeNode(treeNode,node);
                    this.treeNodes.set(newNode.id,newNode);
                    node.tree.set(treeNode, newNode.id);
                    node = newNode;
                    node.dataRowId = row.id;
                    node.dataRowKey = rowId;
                    node.carriesData = false;
                }
                else {
                    node = this.treeNodes.get(node.tree.get(treeNode));
                }
                
            });
            // node now has lowest level in it, add the row
            node.dataRowId = row.id;
            node.carriesData = true;
        }
        else {
            //row excluded
        }
    }

    getRollupRow(key: string,  ) : oDataRow {
        let node: oDataTreeNode = this.treeNodes.get(key);
        return node.getRollupRow(this.treeNodes, this.rows,this.dataGridColumns);
    }

    makeObjectData(rowId: string, developerName: string) : FlowObjectData {
        return this.rows.get(rowId).makeObjectData(developerName,this.config);
    }
}

