import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

const withPermission = (WrappedComponent, requiredPermission) => {
  return function WithPermissionComponent(props) {
    const { hasProjectPermission, hasBoardPermission } = usePermissions();

    const hasPermission = () => {
      if (requiredPermission.startsWith('PROJECT_')) {
        return hasProjectPermission(requiredPermission);
      } else if (requiredPermission.startsWith('BOARD_')) {
        return hasBoardPermission(requiredPermission);
      }
      return false;
    };

    if (!hasPermission()) {
      return null; // or return a "no access" component
    }

    return <WrappedComponent {...props} />;
  };
};

export default withPermission; 