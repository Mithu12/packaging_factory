import { Application } from 'express';

interface Route {
  path: string;
  methods: string[];
}

interface GroupedRoutes {
  [module: string]: Route[];
}

// ANSI color codes
const colors = {
  GET: '\x1b[32m',     // Green
  POST: '\x1b[33m',    // Yellow
  PUT: '\x1b[34m',     // Blue
  PATCH: '\x1b[35m',   // Magenta
  DELETE: '\x1b[31m',  // Red
  HEAD: '\x1b[36m',    // Cyan
  OPTIONS: '\x1b[37m', // White
  reset: '\x1b[0m',    // Reset
  
  // Path colors
  module: '\x1b[96m',  // Bright cyan for module
  endpoint: '\x1b[90m', // Gray for endpoint
  param: '\x1b[93m',   // Bright yellow for parameters
};

export function getAllRoutes(app: Application): Route[] {
  const routes: Route[] = [];
  const seenPaths = new Set<string>();
  
  // Helper to clean regex patterns
  function cleanPath(path: string): string {
    return path
      .replace(/\?(.*)$/g, '')  // Remove everything after ?
      .replace(/\\/g, '')       // Remove backslashes
      .replace(/\^/g, '')       // Remove start anchor
      .replace(/\$/g, '')       // Remove end anchor
      .replace(/\(/g, '')       // Remove opening parenthesis
      .replace(/\)/g, '');      // Remove closing parenthesis
  }
  
  function extractRoutes(stack: any[], basePath: string = ''): void {
    stack.forEach((layer: any) => {
      if (layer.route) {
        // Direct route
        const fullPath = basePath + layer.route.path;
        const methods = Object.keys(layer.route.methods)
          .filter(method => layer.route.methods[method])
          .map(method => method.toUpperCase());
        
        const routeKey = `${methods.join(',')}-${fullPath}`;
        if (!seenPaths.has(routeKey)) {
          seenPaths.add(routeKey);
          routes.push({ path: fullPath, methods });
        }
      } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
        // Router middleware - extract base path
        let routerBasePath = '';
        
        // Try to get a clean path from the regexp
        if (layer.regexp && layer.regexp.source) {
          const source = layer.regexp.source;
          
          // Look for path pattern like \/api\/auth
          const pathMatches = source.match(/\\\/[a-zA-Z0-9_-]+/g);
          if (pathMatches) {
            routerBasePath = pathMatches.join('').replace(/\\\//g, '/');
          } else {
            // Fallback: clean the source string
            routerBasePath = cleanPath(source);
          }
        }
        
        // Recursively process the router's stack
        extractRoutes(layer.handle.stack, basePath + routerBasePath);
      }
    });
  }
  
  const router = (app as any)._router;
  if (router && router.stack) {
    extractRoutes(router.stack);
  }
  
  return routes;
}

function groupRoutesByModule(routes: Route[]): GroupedRoutes {
  const grouped: GroupedRoutes = {};
  
  routes.forEach(route => {
    // Extract module from path like /api/module/...
    const pathParts = route.path.split('/').filter(part => part);
    let module = 'other';
    
    if (pathParts.length >= 2 && pathParts[0] === 'api') {
      module = pathParts[1];
    } else if (pathParts.length >= 1) {
      module = pathParts[0];
    }
    
    if (!grouped[module]) {
      grouped[module] = [];
    }
    grouped[module].push(route);
  });
  
  return grouped;
}

function colorPath(path: string): string {
  // Split path into parts
  const parts = path.split('/');
  const coloredParts = parts.map((part, index) => {
    if (!part) return part;
    
    if (index === 1 && parts[1] === 'api') {
      return `${colors.module}${part}${colors.reset}`;
    } else if (index === 2 && parts[1] === 'api') {
      return `${colors.module}${part}${colors.reset}`;
    } else if (part.startsWith(':')) {
      return `${colors.param}${part}${colors.reset}`;
    } else {
      return `${colors.endpoint}${part}${colors.reset}`;
    }
  });
  
  return coloredParts.join('/');
}

function calculateDisplayLength(text: string): number {
  // Remove ANSI color codes to calculate actual display length
  return text.replace(/\x1b\[[0-9;]*m/g, '').length;
}

export function logRoutes(app: Application): void {
  const routes = getAllRoutes(app);
  const groupedRoutes = groupRoutesByModule(routes);
  
  // Calculate max length for proper alignment
  const maxLength = Math.max(
    ...routes.map(r => r.path.length),
    30
  );

  console.log(`\n╔${'═'.repeat(maxLength + 15)}╗`);
  console.log(`║${' '.repeat(Math.floor((maxLength + 13) / 2))}Registered Routes${' '.repeat(Math.ceil((maxLength + 13) / 2) - 16)}║`);
  console.log(`╚${'═'.repeat(maxLength + 15)}╝\n`);

  // Sort modules alphabetically
  const sortedModules = Object.keys(groupedRoutes).sort();
  
  sortedModules.forEach((module, moduleIndex) => {
    if (moduleIndex > 0) console.log(''); // Add spacing between modules
    
    // Module header
    console.log(`╔${'═'.repeat(maxLength + 15)}`);
    console.log(`║ ${colors.module}${module.toUpperCase()}${colors.reset}${' '.repeat(maxLength + 8 - module.length)}`);
    console.log(`╠${'═'.repeat(maxLength + 15)}`);
    console.log(`║ ${'Method'.padEnd(8)} ${'Path'.padEnd(maxLength)}`);
    console.log(`╠${'═'.repeat(maxLength + 15)}`);
    
    // Sort routes within module
    const sortedRoutes = groupedRoutes[module].sort((a, b) => a.path.localeCompare(b.path));
    
    sortedRoutes.forEach(({ methods, path }) => {
      methods.forEach(method => {
        const methodColor = colors[method as keyof typeof colors] || colors.reset;
        const coloredMethod = `${methodColor}${method}${colors.reset}`;
        const coloredPath = colorPath(path);
        
        // Calculate padding accounting for color codes
        const methodDisplayLength = method.length;
        const pathDisplayLength = calculateDisplayLength(coloredPath);
        const methodPadding = 8 - methodDisplayLength;
        const pathPadding = maxLength - pathDisplayLength;
        
        console.log(`║ ${coloredMethod}${' '.repeat(methodPadding)} ${coloredPath}${' '.repeat(pathPadding)}`);
      });
    });
    
    console.log(`╚${'═'.repeat(maxLength + 15)}`);
  });
  
  console.log('');
}