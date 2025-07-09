// src/types/solid.d.ts

import "solid-js";

declare module "solid-js" {
  namespace JSX {
    interface Directives {
      draggable: boolean | any;
      droppable: boolean | any;
    }
  }
}
