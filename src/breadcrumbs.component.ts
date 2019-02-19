import {Component, Input, OnInit, ViewEncapsulation} from "@angular/core";
import {Router, ActivatedRoute, NavigationEnd, Params, PRIMARY_OUTLET} from "@angular/router";
import {filter} from "rxjs/operators";
import {IBreadcrumb} from "./breadcrumbs.model";
import {BreadcrumbsService} from "./breadcrumbs.service";


@Component({
    selector: "breadcrumb",
    template: `
        <div [ngClass]="{ 'container-fluid': allowBootstrap, 'fluid-bread': true}">
            <div class="container">
                <ol [ngClass]="{ 'breadcrumb': allowBootstrap}" class="{{addClass ? '' + addClass : ''}}">
                    <li *ngFor="let breadcrumb of breadcrumbs; let last = last"
                        [ngClass]="{ 'breadcrumb-item': allowBootstrap, 'list': true, 'active': last }">
                        <a *ngIf="!last" [queryParams]="getQueryParams(breadcrumb)" [routerLink]="hasParams(breadcrumb)">
                            {{breadcrumb.label}}
                        </a>
                        <span *ngIf="last">{{ breadcrumb.label }}</span>
                    </li>
                </ol>
            </div>
        </div>`,
    styles: [`
        .fluid-bread {
            background-color: white;
        }

        .breadcrumb {
            background-color: white;
            padding: 4px;
            margin-bottom: 0;
        }`],
    encapsulation: ViewEncapsulation.None
})

export class BreadcrumbComponent implements OnInit {
  private ROUTE_DATA_BREADCRUMB: string = "breadcrumb";
  private ROUTE_PARAM_BREADCRUMB: string = "breadcrumb";
  private PREFIX_BREADCRUMB: string = "prefixBreadcrumb";

  // The breadcrumbs of the current route
  private currentBreadcrumbs: IBreadcrumb[];
  // All the breadcrumbs
  public breadcrumbs: IBreadcrumb[];

  @Input()
  public allowBootstrap: boolean;

  @Input()
  public addClass: string;


  public constructor(private breadcrumbService: BreadcrumbsService, private activatedRoute: ActivatedRoute, private router: Router) {
    breadcrumbService.get().subscribe((breadcrumbs: IBreadcrumb[]) => {
      this.breadcrumbs = breadcrumbs as IBreadcrumb[];
    });
  }

  public hasParams(breadcrumb: IBreadcrumb) {
    return Object.keys(breadcrumb.params).length ? [breadcrumb.url, breadcrumb.params] : [breadcrumb.url];
  }

  public hasQueryParams(breadcrumb: IBreadcrumb){
    return Object.keys(breadcrumb.queryParams).length ? [breadcrumb.queryParams] : '';
  }


  public ngOnInit() {
    if(this.router.navigated){
      this.generateBreadcrumbTrail();
    };

    // subscribe to the NavigationEnd event
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd
    )).subscribe(event => {
      this.generateBreadcrumbTrail();
    });
  }

  private generateBreadcrumbTrail(){
    // reset currentBreadcrumbs
    this.currentBreadcrumbs = [];


    // get the root of the current route
    let currentRoute: ActivatedRoute = this.activatedRoute.root;


    // set the url to an empty string
    let url: string = "";

    // iterate from activated route to children
    while (currentRoute.children.length > 0) {
      let childrenRoutes: ActivatedRoute[] = currentRoute.children;
      let breadCrumbLabel: string = "";

      // iterate over each children
      childrenRoutes.forEach(route => {
        // Set currentRoute to this route
        currentRoute = route;
        // Verify this is the primary route
        if (route.outlet !== PRIMARY_OUTLET) {
          return;
        }
        const hasData = (route.routeConfig && route.routeConfig.data);
        const hasDynamicBreadcrumb: boolean = route.snapshot.params.hasOwnProperty(this.ROUTE_PARAM_BREADCRUMB);

        if (hasData || hasDynamicBreadcrumb) {
          /*
          Verify the custom data property "breadcrumb"
          is specified on the route or in its parameters.

          Route parameters take precedence over route data
          attributes.
          */
          if (hasDynamicBreadcrumb) {
            breadCrumbLabel = route.snapshot.params[this.ROUTE_PARAM_BREADCRUMB].replace(/_/g, " ");
          } else if (route.snapshot.data.hasOwnProperty(this.ROUTE_DATA_BREADCRUMB)) {
            breadCrumbLabel = route.snapshot.data[this.ROUTE_DATA_BREADCRUMB];
          }
          // Get the route's URL segment
          let routeURL: string = route.snapshot.url.map(segment => segment.path).join("/");
          url += `/${routeURL}`;
          // Cannot have parameters on a root route
          if (routeURL.length === 0) {
            route.snapshot.params = {};
          }
          // Add breadcrumb
          let breadcrumb: IBreadcrumb = {
            label: breadCrumbLabel,
            params: route.snapshot.params,
            url: url
          };
          // Add the breadcrumb as 'prefixed'. It will appear before all breadcrumbs
          if (route.snapshot.data.hasOwnProperty(this.PREFIX_BREADCRUMB)) {
            this.breadcrumbService.storePrefixed(breadcrumb);
          }
          else {
            this.currentBreadcrumbs.push(breadcrumb);
          }
        }
      });
      this.breadcrumbService.store(this.currentBreadcrumbs);
    }
  }
}
