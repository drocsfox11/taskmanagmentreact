import LeftMenu from "../components/LeftMenu";
import {Outlet} from "react-router-dom";


function LoginPage() {


    return (
       <div  style={{ display: 'flex', flexDirection: 'row',width: '100%',height: '100%',overflow: 'hidden' }}>
           <LeftMenu></LeftMenu>
           <Outlet></Outlet>
       </div>
    );
}

export default LoginPage;
