import LeftMenu from "../components/LeftMenu";
import {Outlet} from "react-router-dom";


function ContentContainer() {
    console.log('ContentContainer');

    return (
       <div  style={{ display: 'flex', flexDirection: 'row',width: '100%',height: '100%',overflow: 'hidden' }}>
           <LeftMenu></LeftMenu>
           <Outlet></Outlet>
       </div>
    );
}

export default ContentContainer;
