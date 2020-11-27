import React from "react";

export const navigationRef = React.createRef<any>();

export const navigate = (name: string, params?: any) =>
  navigationRef.current?.navigate(name, params);

export const reset = (args: { index: number; routes: any[] }) =>
  navigationRef.current?.reset(args);

export const getCurrentRoute = () => navigationRef.current?.getCurrentRoute();
