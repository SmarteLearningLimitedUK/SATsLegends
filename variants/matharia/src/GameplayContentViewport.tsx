import React from 'react';
/** Real, bounded layout regions; never shrink the whole game to conceal overflow. */
export default function GameplayContentViewport({children}:{children:React.ReactNode;ambientImage?:string}){
 return <div data-gameplay-content-viewport className="matharia-content-viewport"><div data-gameplay-content-stage>{children}</div></div>;
}
